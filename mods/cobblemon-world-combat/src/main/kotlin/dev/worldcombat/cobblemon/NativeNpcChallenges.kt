package dev.worldcombat.cobblemon

import com.cobblemon.mod.common.api.battles.model.PokemonBattle
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.events.battles.BattleStartedEvent
import com.cobblemon.mod.common.api.events.battles.BattleVictoryEvent
import com.cobblemon.mod.common.api.storage.party.NPCPartyStore
import com.bedrockk.molang.runtime.MoParams
import com.bedrockk.molang.runtime.value.DoubleValue
import com.cobblemon.mod.common.battles.*
import com.cobblemon.mod.common.battles.actor.PlayerBattleActor
import com.cobblemon.mod.common.entity.npc.NPCBattleActor
import com.cobblemon.mod.common.entity.npc.NPCEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.activestate.ActivePokemonState
import com.cobblemon.mod.common.pokemon.activestate.InactivePokemonState
import com.cobblemon.mod.common.pokemon.activestate.SentOutState
import com.cobblemon.mod.common.util.update
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.runtime.effect.EffectData
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.core.BlockPos
import net.minecraft.network.chat.Component
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerLevel
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.Entity
import net.minecraft.world.entity.player.Player
import net.minecraft.world.phys.AABB
import net.minecraft.world.phys.Vec3
import java.util.Collections
import java.util.UUID
import java.util.WeakHashMap
import java.util.function.Consumer

/** Native identity and lifecycle bridge. Challenge rules and combat decisions are supplied by content. */
object NativeNpcChallenges {
    private var policyEpoch = -1L
    private var policy: Consumer<NativeNpcChallengeContext>? = null
    private val sessions = LinkedHashMap<UUID, Session>()
    // Retained native handles must remain isolated from Showdown even after their session has closed.
    private val tokens = Collections.newSetFromMap(WeakHashMap<PokemonBattle, Boolean>())

    internal class Session(
        val battle: PokemonBattle,
        val playerActor: PlayerBattleActor,
        val npcActor: NPCBattleActor,
        val player: ServerPlayer,
        val npc: NPCEntity,
        val combat: MinecraftCombat,
        val epoch: Long
    ) {
        val level = player.serverLevel()
        val trainer = combat.bind(npc)
        val challenger = combat.bind(player)
        val members = npcActor.pokemonList.map { it.effectedPokemon }
        val configuredParty = npc.party
        val stores = members.map { it.storeCoordinates.get()?.store as? NPCPartyStore }
        val deployed = LinkedHashMap<UUID, Pair<PokemonEntity, ActorHandle>>()
        var state = "{}"
        var announced = false
        var ending = false
        var outcome = ""
        var reason = ""
        val slots = battle.format.battleType.slotsPerActor
        fun owns(index: Int): Boolean {
            val pokemon = members[index]
            val coordinates = pokemon.storeCoordinates.get() ?: return false
            return coordinates.store === stores[index] && coordinates.get() === pokemon &&
                (coordinates.store as? NPCPartyStore)?.npc === npc
        }
    }

    fun register(epoch: Long, callback: Consumer<NativeNpcChallengeContext>) {
        check(epoch == CombatServices.CONTENT.epoch() && !CombatServices.CONTENT.ready())
        check(policyEpoch != epoch || policy == null) { "Duplicate NPC challenge policy" }
        // Registration runs during reload; old callbacks are never invoked in the new content epoch.
        sessions.values.toList().forEach { finish(it, "cancelled", "content-reloaded") }
        policyEpoch = epoch
        policy = callback
    }

    private fun formatReason(format: BattleFormat, clone: Boolean = false): String? = when {
        clone || format.adjustLevel > 0 -> "unsupported_clones"
        format.mod != "cobblemon" || format.gen != 9 || format.battleType.actorsPerSide != 1 ||
            format.battleType.slotsPerActor !in 1..3 || format.battleType.name !in setOf("singles", "doubles", "triples") -> "unsupported_format"
        format.ruleSet.any { it !in setOf(BattleRules.OBTAINABLE, BattleRules.PAST, BattleRules.UNOBTAINABLE) } -> "unsupported_rules"
        else -> null
    }

    /** Runs before pvn can clone, heal, or change the level of a native party. */
    @JvmStatic fun preflight(player: ServerPlayer, npc: NPCEntity, format: BattleFormat, clone: Boolean): BattleStartResult? {
        val reason = formatReason(format, clone)
            ?: if (sessions.values.any { it.player.uuid == player.uuid || it.npc.uuid == npc.uuid }) "busy" else null
        return reason?.let { refusal(player, it) }
    }

    /** Null means this is outside the supported native player/NPC pairing. */
    @JvmStatic fun start(format: BattleFormat, first: BattleSide, second: BattleSide, canPreempt: Boolean): BattleStartResult? {
        if (first.actors.size != 1 || second.actors.size != 1) return null
        val actors = listOf(first.actors.single(), second.actors.single())
        val playerActor = actors.filterIsInstance<PlayerBattleActor>().singleOrNull() ?: return null
        val npcActor = actors.filterIsInstance<NPCBattleActor>().singleOrNull() ?: return null
        val player = playerActor.entity ?: return ErroredBattleStart()
        val npc = npcActor.npc
        val server = player.server
        val combat = CombatServices.get(server)
        combat.checkThread()
        formatReason(format)?.let { return refusal(player, it) }
        if (policyEpoch != CombatServices.CONTENT.epoch() || policy == null || !CombatServices.CONTENT.ready())
            return refusal(player, "start_failed")
        if (sessions.values.any { it.player.uuid == player.uuid || it.npc.uuid == npc.uuid } || npc.isInBattle())
            return refusal(player, "busy")
        if (!player.isAlive || !npc.isAlive || npc.isRemoved || player.level() !== npc.level() ||
            (npc.level() as? ServerLevel)?.getEntity(npc.uuid) !== npc) return refusal(player, "start_failed")
        val teams = playerActor.pokemonList + npcActor.pokemonList
        if (teams.any { it.originalPokemon !== it.effectedPokemon }) return refusal(player, "unsupported_clones")
        if (playerActor.pokemonList.any { it.effectedPokemon.getOwnerUUID() != player.uuid } ||
            npcActor.pokemonList.any { it.effectedPokemon.getOwnerNPC() !== npc || it.effectedPokemon.state is ActivePokemonState })
            return refusal(player, "busy")
        val slots = format.battleType.slotsPerActor
        if (playerActor.pokemonList.count { it.health > 0 } < slots || npcActor.pokemonList.count { it.health > 0 } < slots)
            return refusal(player, "start_failed")
        val battle = PokemonBattle(format.copy(ruleSet = format.ruleSet.toSet()), first, second)
        tokens.add(battle)
        val session = Session(battle, playerActor, npcActor, player, npc, combat, policyEpoch)
        sessions[battle.battleId] = session
        try {
            if (canPreempt) {
                val pre = BattleStartedEvent.Pre(battle)
                CobblemonEvents.BATTLE_STARTED_PRE.post(pre)
                if (pre.isCanceled || session.ending) {
                    finish(session, "cancelled", "start-cancelled")
                    return ErroredBattleStart(mutableSetOf(BattleStartError.canceledByEvent(pre.reason)))
                }
            }
            playerActor.showdownId = if (first.actors.single() === playerActor) "p1" else "p2"
            npcActor.showdownId = if (first.actors.single() === npcActor) "p1" else "p2"
            repeat(slots) { npcActor.activePokemon.add(ActiveBattlePokemon(npcActor)) }
            repeat(slots) { playerActor.activePokemon.add(ActiveBattlePokemon(playerActor)) }
            npc.entityData.update(NPCEntity.BATTLE_IDS) { it + battle.battleId }
            battle.started = true
            if (canPreempt) CobblemonEvents.BATTLE_STARTED_POST.post(BattleStartedEvent.Post(battle))
            if (session.ending) return refusal(player, "start_failed")
            // The first tick invokes content after callers have received the handle and attached end handlers.
            return SuccessfulBattleStart(battle)
        } catch (error: RuntimeException) {
            finish(session, "cancelled", "start-failed")
            CobblemonWorldCombat.LOGGER.error("NPC challenge could not start", error)
            return refusal(player, "start_failed")
        }
    }

    private fun refusal(player: ServerPlayer, reason: String): BattleStartResult {
        val message = Component.translatable("worldcombat.npc_challenge.$reason")
        player.sendSystemMessage(message)
        return ErroredBattleStart(mutableSetOf(BattleStartError.canceledByEvent(message)))
    }

    @JvmStatic fun managed(battle: PokemonBattle) = tokens.contains(battle)
    @JvmStatic fun getBattle(id: UUID): PokemonBattle? = sessions[id]?.battle
    @JvmStatic fun getBattleByPlayer(id: UUID): PokemonBattle? = sessions.values.firstOrNull { it.player.uuid == id }?.battle

    /** Attribution only; the existing growth policy owns XP/EV amounts and the damage path owns defeat deduplication. */
    @JvmStatic fun trainerOpponent(attacker: PokemonEntity, defeated: PokemonEntity): Boolean {
        val owner = attacker.pokemon.getOwnerPlayer() ?: return false
        val s = sessions.values.firstOrNull { !it.ending && it.player === owner } ?: return false
        s.combat.checkThread()
        if (attacker.level() !== s.level || defeated.level() !== s.level || defeated.pokemon.currentHealth > 0) return false
        val coordinates = attacker.pokemon.storeCoordinates.get() ?: return false
        if (coordinates.get() !== attacker.pokemon) return false
        val index = s.members.indexOfFirst { it === defeated.pokemon }
        return index >= 0 && s.owns(index) &&
            (s.deployed[defeated.pokemon.uuid]?.first === defeated || defeated.pokemon.entity === defeated)
    }

    /** Legacy operation locks use the native branch; MoLang still reports the actual managed challenge. */
    @JvmStatic fun operationBattle(player: ServerPlayer): PokemonBattle? =
        BattleRegistry.getBattleByParticipatingPlayer(player)?.takeUnless(::managed)

    @JvmStatic fun playerFunctions(player: Player, functions: MutableMap<String, (MoParams) -> Any>) {
        if (player !is ServerPlayer) return
        val previousInBattle = functions["in_battle"]
        val previousBattle = functions["battle"]
        functions["in_battle"] = { params ->
            if (getBattleByPlayer(player.uuid) != null) DoubleValue.ONE else previousInBattle?.invoke(params) ?: DoubleValue.ZERO
        }
        functions["battle"] = { params -> getBattleByPlayer(player.uuid)?.struct ?: previousBattle?.invoke(params) ?: DoubleValue.ZERO }
    }

    /** Native stop/end/close are cancellation requests; only the validated content outcome can award victory. */
    @JvmStatic fun endNative(battle: PokemonBattle, reason: String): Boolean {
        if (!managed(battle)) return false
        sessions[battle.battleId]?.let {
            // A cancellable native death event may call stop() before another subscriber rescues the player.
            // The server post-tick observes the final death state and decides the actual result.
            if (reason != "native-stop" || it.player.isAlive) finish(it, "cancelled", reason)
        }
        return true
    }

    fun tick(server: MinecraftServer) {
        for (session in sessions.values.toList()) {
            if (session.player.server !== server || session.ending) continue
            val cause = invalidReason(session)
            if (cause != null) {
                finish(session, if (cause == "player-defeated") "npc-win" else "cancelled", cause)
                continue
            }
            syncActive(session)
            val operation = if (!session.announced) "start" else "tick"
            session.announced = true
            invoke(session, operation)
        }
    }

    private fun invalidReason(s: Session): String? = when {
        s.epoch != CombatServices.CONTENT.epoch() || policyEpoch != s.epoch || !CombatServices.CONTENT.ready() -> "content-reloaded"
        s.player.server.playerList.getPlayer(s.player.uuid) !== s.player -> "player-left"
        s.player.level() !== s.level || s.npc.level() !== s.level -> "dimension-changed"
        !s.npc.isAlive || s.npc.isRemoved || s.level.getEntity(s.npc.uuid) !== s.npc -> "trainer-left"
        !s.player.isAlive -> "player-defeated"
        s.player.isRemoved -> "player-left"
        s.npc.party !== s.configuredParty || s.members.indices.any { !s.owns(it) } -> "party-changed"
        else -> null
    }

    private fun syncActive(s: Session) {
        s.members.forEachIndexed { index, pokemon ->
            if (s.owns(index)) pokemon.entity?.let { s.deployed[pokemon.uuid] = it to s.combat.bind(it) }
        }
        for (actor in listOf(s.npcActor, s.playerActor)) {
            val active = actor.pokemonList.filter { it.effectedPokemon.state is SentOutState && it.entity?.isRemoved == false }
            actor.activePokemon.forEachIndexed { index, slot -> slot.battlePokemon = active.getOrNull(index) }
        }
    }

    private fun invoke(session: Session, operation: String) {
        val callback = policy?.takeIf { policyEpoch == session.epoch && session.epoch == CombatServices.CONTENT.epoch() && CombatServices.CONTENT.ready() } ?: return
        val context = NativeNpcChallengeContext(session, operation)
        try { callback.accept(context) }
        catch (error: RuntimeException) {
            CobblemonWorldCombat.LOGGER.error("NPC challenge policy failed during {}", operation, error)
            if (!session.ending) {
                session.player.sendSystemMessage(Component.translatable("worldcombat.npc_challenge.start_failed"))
                finish(session, "cancelled", "script-error")
            }
        } finally { context.close() }
    }

    internal fun requestFinish(s: Session, outcome: String, reason: String) {
        require(outcome in setOf("player-win", "npc-win", "cancelled")) { "Invalid challenge outcome" }
        require(reason.length <= 128)
        if (outcome == "player-win") {
            check(invalidReason(s) == null && s.members.all { it.currentHealth <= 0 }) { "NPC party has not been defeated" }
        } else if (outcome == "npc-win") {
            check(invalidReason(s) == "player-defeated") { "The player has not been defeated" }
        }
        finish(s, outcome, reason)
    }

    private fun finish(s: Session, outcome: String, reason: String) {
        if (s.ending) return
        s.combat.checkThread()
        s.ending = true
        s.outcome = outcome
        s.reason = reason
        val battle = s.battle
        battle.ended = true
        if (outcome == "player-win") {
            battle.winners = listOf(s.playerActor); battle.losers = listOf(s.npcActor)
        } else if (outcome == "npc-win") {
            battle.winners = listOf(s.npcActor); battle.losers = listOf(s.playerActor)
        }
        // Drop occupancy before callbacks so a handler sees a closed challenge, even if another handler fails.
        sessions.remove(battle.battleId)
        s.npc.entityData.update(NPCEntity.BATTLE_IDS) { it - battle.battleId }
        s.members.forEachIndexed { index, pokemon ->
            val deployment = s.deployed[pokemon.uuid]
            if (deployment != null) {
                val (entity, actor) = deployment
                safely("action cleanup") { s.combat.runtime().cancelActor(actor, "npc-challenge-ended") }
                safely("control cleanup") { s.combat.controlled(actor, false) }
                if (s.owns(index) && pokemon.entity === entity) {
                    safely("party recall") { pokemon.recall() }
                    // Release this session's native representation even when a recall subscriber vetoed recall.
                    if (s.owns(index) && pokemon.entity === entity) {
                        pokemon.state = InactivePokemonState()
                        safely("entity cleanup") { entity.discard() }
                    }
                }
            }
            if (s.npc.npc.autoHealParty && s.owns(index)) safely("party healing") { pokemon.heal() }
        }
        s.npcActor.activePokemon.clear()
        s.playerActor.activePokemon.clear()
        invoke(s, "end")
        for (handler in battle.onEndHandlers.toList()) {
            try { handler(battle) }
            catch (error: RuntimeException) { CobblemonWorldCombat.LOGGER.error("NPC challenge end handler failed", error) }
        }
        battle.onEndHandlers.clear()
        if (outcome != "cancelled") {
            try {
                battle.winners.forEach { it.win(battle.winners.filterNot { winner -> winner === it }, battle.losers) }
                battle.losers.forEach { it.lose(battle.winners, battle.losers.filterNot { loser -> loser === it }) }
                CobblemonEvents.BATTLE_VICTORY.post(BattleVictoryEvent(battle, battle.winners, battle.losers, false))
            } catch (error: RuntimeException) { CobblemonWorldCombat.LOGGER.error("NPC challenge victory callback failed", error) }
        }
    }

    private fun safely(operation: String, action: () -> Unit) {
        try { action() }
        catch (error: RuntimeException) { CobblemonWorldCombat.LOGGER.error("NPC challenge {} failed", operation, error) }
    }

    fun stop(server: MinecraftServer, reason: String) {
        sessions.values.filter { it.player.server === server }.toList().forEach { finish(it, "cancelled", reason) }
    }

    fun cancelPlayer(player: ServerPlayer, reason: String) {
        sessions.values.filter { it.player === player }.toList().forEach { finish(it, "cancelled", reason) }
    }

    fun left(entity: Entity) {
        sessions.values.filter { it.npc === entity || it.player === entity }.toList()
            .forEach { finish(it, "cancelled", "participant-left") }
    }
}

/** Callback-scoped native challenge capabilities. A finished or reloaded callback cannot continue mutating it. */
class NativeNpcChallengeContext internal constructor(
    private val session: NativeNpcChallenges.Session,
    private val operation: String
) {
    private var open = true
    internal fun close() { open = false }
    private fun check() {
        session.combat.checkThread()
        if (!open || session.epoch != CombatServices.CONTENT.epoch() || !CombatServices.CONTENT.ready() ||
            session.ending && operation != "end") throw ActionInactiveException("NPC challenge scope expired")
    }
    private fun mutable() { check(); if (session.ending) throw ActionInactiveException("NPC challenge ended") }
    fun id(): String { check(); return session.battle.battleId.toString() }
    fun operation(): String { check(); return operation }
    fun outcome(): String { check(); return session.outcome }
    fun reason(): String { check(); return session.reason }
    fun definition(): String { check(); return session.npc.npc.id.toString() }
    fun skill(): Int { check(); return session.npcActor.skill }
    fun trainer(): ActorHandle { check(); return session.trainer }
    fun player(): ActorHandle { check(); return session.challenger }
    fun playerAlive(): Boolean { check(); return session.player.isAlive }
    fun slots(): Int { check(); return session.slots }
    fun state(): String { check(); return session.state }
    fun state(json: String) { mutable(); session.state = EffectData.copy(json) }
    fun world(): WorldAccess? { check(); return access(session.trainer) }
    fun memberWorld(index: Int): WorldAccess? {
        check()
        val entity = member(index).entity ?: return null
        return access(session.combat.bind(entity))
    }
    private fun access(actor: ActorHandle): WorldAccess? = if (!session.combat.valid(actor)) null else
        WorldAccess(session.combat.runtime(), actor, null, ::check, !session.ending, 0)
    private fun member(index: Int): Pokemon {
        require(index in session.members.indices) { "Invalid NPC party index" }
        return session.members[index]
    }
    fun roster(): String {
        check()
        val array = JsonArray()
        session.members.forEachIndexed { index, pokemon ->
            val entry = JsonObject()
            entry.addProperty("index", index)
            entry.addProperty("id", pokemon.uuid.toString())
            entry.addProperty("name", pokemon.getDisplayName().string)
            entry.addProperty("health", pokemon.currentHealth)
            entry.addProperty("maxHealth", pokemon.maxHealth)
            entry.addProperty("fainted", pokemon.isFainted())
            entry.addProperty("active", pokemon.state is ActivePokemonState)
            entry.addProperty("state", pokemon.state.name)
            val actor = pokemon.entity?.let(session.combat::bind)?.takeIf(session.combat::valid)
            entry.addProperty("ref", actor?.ref() ?: "")
            array.add(entry)
        }
        return array.toString()
    }
    fun send(index: Int, point: Point): String {
        mutable()
        val pokemon = member(index)
        if (!session.owns(index)) return result(false, "party-changed")
        if (pokemon.isFainted()) return result(false, "fainted")
        if (pokemon.state !is InactivePokemonState) return result(false, "already-out")
        if (session.members.count { it.state is ActivePokemonState } >= session.slots) return result(false, "slots-full")
        if (!placeable(pokemon, point)) return result(false, "blocked")
        val entity = pokemon.sendOut(session.level, Vec3(point.x(), point.y(), point.z()), null) ?: return result(false, "send-refused")
        // sendOut's PRE subscribers may end the challenge or transfer a party member.
        if (session.ending || !session.owns(index)) {
            if (session.owns(index) && pokemon.entity === entity) {
                try { pokemon.recall() }
                finally {
                    if (session.owns(index) && pokemon.entity === entity) {
                        pokemon.state = InactivePokemonState()
                        entity.discard()
                    }
                }
            }
            return result(false, "challenge-ended")
        }
        val actor = session.combat.bind(entity)
        session.deployed[pokemon.uuid] = entity to actor
        return result(true, "", actor.ref())
    }
    private fun placeable(pokemon: Pokemon, point: Point): Boolean {
        if (!point.x().isFinite() || !point.y().isFinite() || !point.z().isFinite() ||
            session.npc.distanceToSqr(point.x(), point.y(), point.z()) > 64.0 * 64.0) return false
        val hitbox = pokemon.form.hitbox
        val width = hitbox.width().toDouble().coerceAtLeast(0.01)
        val height = hitbox.height().toDouble().coerceAtLeast(0.01)
        val box = AABB(point.x() - width / 2, point.y(), point.z() - width / 2, point.x() + width / 2, point.y() + height, point.z() + width / 2)
        val min = BlockPos.containing(box.minX, box.minY, box.minZ)
        val max = BlockPos.containing(box.maxX - 1e-4, box.maxY - 1e-4, box.maxZ - 1e-4)
        val level = session.level
        return level.hasChunksAt(min, max) && !level.isOutsideBuildHeight(min) && !level.isOutsideBuildHeight(max) &&
            level.worldBorder.isWithinBounds(box) && !level.getBlockCollisions(null, box).iterator().hasNext() &&
            level.getEntities(null, box) { it.isAlive && it.canBeCollidedWith() }.isEmpty()
    }
    fun recall(index: Int): Boolean {
        mutable()
        val pokemon = member(index)
        if (!session.owns(index) || pokemon.state !is ActivePokemonState) return false
        val actor = pokemon.entity?.let(session.combat::bind)
        pokemon.recall()
        if (pokemon.state is ActivePokemonState) return false
        if (actor != null) {
            session.combat.runtime().cancelActor(actor, "npc-recalled")
            session.combat.controlled(actor, false)
        }
        return true
    }
    fun finish(outcome: String, reason: String) { mutable(); NativeNpcChallenges.requestFinish(session, outcome, reason) }
    fun message(key: String, args: String) {
        check()
        require(key.matches(Regex("[a-z0-9_.:-]{1,160}")))
        require(args.length <= 4096)
        val values = JsonParser.parseString(args).asJsonArray
        require(values.size() <= 12 && values.all { it.isJsonPrimitive })
        session.player.sendSystemMessage(Component.translatable(key, *values.map { it.asString }.toTypedArray()))
    }
    private fun result(ok: Boolean, reason: String, ref: String = ""): String = JsonObject().also {
        it.addProperty("ok", ok); it.addProperty("reason", reason); it.addProperty("ref", ref)
    }.toString()
}
