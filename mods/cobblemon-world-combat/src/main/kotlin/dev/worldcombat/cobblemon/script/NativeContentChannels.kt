package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.pokemon.Pokemon
import dev.latvian.mods.kubejs.script.ConsoleJS
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.control.RequestGate
import dev.worldcombat.cobblemon.network.ContentReply
import dev.worldcombat.cobblemon.network.ContentRequest
import dev.worldcombat.core.runtime.ActionInactiveException
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.effect.EffectData
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.level.ServerPlayer
import net.neoforged.neoforge.network.PacketDistributor
import java.util.WeakHashMap
import java.util.function.Consumer

/** Per-content request handlers. Only the current owner's party is addressable. */
object NativeContentChannels {
    private var epoch = -1L
    private val handlers = linkedMapOf<String, Consumer<ContentRequestContext>>()
    // Minecraft reuses the player's entity id at respawn, including Entity.equals/hashCode.
    // A request sequence belongs to the control session that issued it.
    private val gates = WeakHashMap<CompanionControl.Session, RequestGate>()

    fun reset() { epoch = -1; handlers.clear(); gates.clear(); NativeContentSubscriptions.reset() }

    fun register(expectedEpoch: Long, id: String, handler: Consumer<ContentRequestContext>) {
        check(expectedEpoch == CombatServices.CONTENT.epoch() && !CombatServices.CONTENT.ready())
        EffectData.id(id)
        if (epoch != expectedEpoch) { handlers.clear(); gates.clear(); epoch = expectedEpoch }
        check(id !in handlers) { "Duplicate content channel: $id" }
        handlers[id] = handler
    }

    internal fun owned(player: ServerPlayer, uuid: java.util.UUID): Pokemon? =
        Cobblemon.storage.getParty(player).firstOrNull { it.uuid == uuid && it.getOwnerUUID() == player.uuid }
            ?: NativePasture.owned(player).firstOrNull { it.pokemon.uuid == uuid }?.pokemon

    fun request(player: ServerPlayer, request: ContentRequest) {
        val reply = process(player, request)
        PacketDistributor.sendToPlayer(player, reply)
    }

    /** Synchronous result keeps protocol validation independently testable from transport. */
    internal fun process(player: ServerPlayer, request: ContentRequest): ContentReply {
        val combat = CombatServices.get(player.server)
        combat.checkThread()
        if (!CompanionControl.isCurrentPlayer(player)) return ContentReply(request.session(), request.sequence(),
            CombatServices.CONTENT.epoch(), request.channel().take(128), request.pokemon(), "stale-session", "{}")
        val session = CompanionControl.session(player)
        fun result(code: String, data: String = "{}") = ContentReply(session.id, request.sequence(),
            CombatServices.CONTENT.epoch(), request.channel().take(128), request.pokemon(), code, data)
        if (request.session() != session.id) return result("stale-session")
        if (request.epoch() != CombatServices.CONTENT.epoch() || !CombatServices.CONTENT.ready()) return result("stale-content")
        val gate = gates.getOrPut(session) { RequestGate() }
        val refusal = gate.accept(request.sequence(), player.server.tickCount.toLong(), request.observedTick())
        if (refusal.isNotEmpty()) return result(refusal)
        var context: ContentRequestContext? = null
        return try {
            EffectData.id(request.channel())
            val input = NativeContentData.canonical(request.input())
            val pokemon = owned(player, request.pokemon()) ?: return result("not-owned-party")
            val handler = handlers[request.channel()]?.takeIf { epoch == request.epoch() }
                ?: return result("channel-unavailable")
            context = ContentRequestContext(player, request.epoch(), pokemon, input)
            handler.accept(context)
            val output = context.finish()
            val body = com.google.gson.JsonParser.parseString(output)
            val dependencies = if (body.isJsonObject) body.asJsonObject.getAsJsonArray("dependencies")
                ?.filter { it.isJsonPrimitive && it.asJsonPrimitive.isString }?.map { it.asString }?.toSet() ?: emptySet() else emptySet()
            NativeContentSubscriptions.viewed(player, request.channel(), pokemon.uuid, !body.isJsonObject || !body.asJsonObject.has("error"), dependencies)
            result("ok", output)
        } catch (error: RuntimeException) {
            val cause = generateSequence(error as Throwable) { it.cause }.take(8).firstOrNull {
                it is ActionRejectedException || it is ActionInactiveException || it is IllegalArgumentException
            }
            val code = when (cause) {
                is ActionRejectedException -> cause.reason().takeIf { it.matches(Regex("[a-z0-9_-]{1,64}")) } ?: "rejected"
                is ActionInactiveException -> "request-expired"
                is IllegalArgumentException -> "invalid-data"
                else -> { ConsoleJS.SERVER.error("WorldCombat content channel ${request.channel()} failed", error); "script-error" }
            }
            result(code)
        } finally { context?.close() }
    }
}

/** Callback-scoped reads and staged CAS writes, published together after successful handling. */
class ContentRequestContext internal constructor(private val player: ServerPlayer, private val epoch: Long,
    private val individual: Pokemon, private val inputValue: String) {
    private var open = true
    private val view = PokemonView.capture(individual)
    private val changes = linkedMapOf<String, NativeContentData.Change>()
    private var response: String? = null
    private var observation: dev.worldcombat.core.runtime.WorldAccess? = null
    private var observedActor: dev.worldcombat.core.runtime.ActorHandle? = null

    private fun checkOpen() {
        CombatServices.get(player.server).checkThread()
        if (!open || epoch != CombatServices.CONTENT.epoch() || !CombatServices.CONTENT.ready())
            throw ActionInactiveException("Content request expired")
        if (NativeContentChannels.owned(player, individual.uuid) !== individual)
            throw ActionInactiveException("Individual left the owner's party or pasture")
    }
    fun pokemon(): PokemonView { checkOpen(); return view }
    fun input(): String { checkOpen(); return inputValue }
    fun actor(): dev.worldcombat.core.runtime.ActorHandle? {
        checkOpen()
        val entity = individual.entity ?: return null
        if (entity.level() !== player.level() || !entity.isAlive || entity.isRemoved) return null
        val combat = CombatServices.get(player.server)
        val actor = observedActor ?: combat.bind(entity).also { observedActor = it }
        return actor.takeIf { combat.valid(it) && combat.inspect(it) === entity }
    }
    /** Current player's party and loaded pasture residents, for menus that switch the controlled individual. */
    fun roster(): String = run { checkOpen(); NativePasture.roster(player) }
    fun world(): dev.worldcombat.core.runtime.WorldAccess? {
        checkOpen()
        val subject = actor() ?: return null
        return observation ?: dev.worldcombat.core.runtime.WorldAccess(CombatServices.get(player.server).runtime(), subject, player.uuid,
            { checkOpen(); if (actor() != subject) throw ActionInactiveException("Observed entity left") }, false, 0).also { observation = it }
    }
    fun data(key: String): String? {
        checkOpen(); EffectData.id(key)
        return if (key in changes) changes.getValue(key).value else NativeContentData.read(individual, key)
    }
    fun compareData(key: String, expected: String?, value: String?): Boolean {
        checkOpen(); EffectData.id(key)
        val wanted = expected?.let(NativeContentData::canonical)
        val replacement = value?.let(NativeContentData::canonical)
        val current = data(key)
        if (current != wanted) return false
        changes[key] = NativeContentData.Change(if (key in changes) changes.getValue(key).expected else current, replacement)
        return true
    }
    fun reply(json: String) { checkOpen(); check(response == null) { "Content reply already set" }; response = NativeContentData.document(json) }
    internal fun finish(): String {
        checkOpen()
        if (!NativeContentData.compare(individual, changes)) throw ActionRejectedException("data-changed")
        open = false
        return response ?: "{}"
    }
    internal fun close() { open = false; changes.clear() }
}
