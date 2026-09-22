package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ContentReply
import dev.worldcombat.cobblemon.network.ContentRequest
import dev.worldcombat.cobblemon.script.ContentRequestContext
import dev.worldcombat.cobblemon.script.NativeContentChannels
import dev.worldcombat.cobblemon.script.NativeContentData
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionInactiveException
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.CombatServices
import io.netty.buffer.Unpooled
import net.minecraft.nbt.CompoundTag
import net.minecraft.network.RegistryFriendlyByteBuf
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Live native storage and request authorization, including recalled individuals and scoped CAS. */
object NativeContentServerChecks {
    private var age = 0
    private var done = false
    private var sequence = 0L
    private lateinit var player: ServerPlayer
    private lateinit var other: ServerPlayer
    private lateinit var individual: Pokemon
    private lateinit var stranger: Pokemon
    private lateinit var entity: PokemonEntity
    private var ownerLease: AutoCloseable? = null
    private var otherLease: AutoCloseable? = null
    private var retained: ContentRequestContext? = null
    private const val KEY = "checks:state"

    @JvmStatic fun install() {
        NativeContentChannels.register(CombatServices.CONTENT.epoch(), "checks:content") { request ->
            val input = JsonParser.parseString(request.input()).asJsonObject
            when (input.get("operation").asString) {
                "inspect" -> request.reply("{\"id\":\"${request.pokemon().id()}\",\"stored\":${request.data(KEY) ?: "null"}}")
                "chain" -> {
                    check(request.compareData(KEY, null, "{\"n\":1}"))
                    check(request.compareData(KEY, "{\"n\":1.0}", "{\"n\":2}"))
                    check(request.data(KEY) == "{\"n\":2}")
                    request.reply("{\"changed\":true}")
                }
                "stale" -> request.reply("{\"changed\":${request.compareData(KEY, null, "{\"n\":3}")}}")
                "rollback" -> {
                    check(request.compareData(KEY, "{\"n\":2}", "{\"n\":99}"))
                    request.reply("[]")
                }
                "retain" -> { retained = request; request.reply("{}") }
                "remove" -> {
                    check(request.compareData(KEY, "{\"n\":2}", null))
                    request.reply("{}")
                }
                "transfer" -> {
                    check(request.compareData("checks:ownership", null, "{\"n\":1}"))
                    check(Cobblemon.storage.getParty(player).remove(individual))
                    check(Cobblemon.storage.getParty(other).add(individual))
                }
            }
        }
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P5ContentOwner"))
                    other = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P5ContentOther"))
                    player.moveTo(0.0, 100.0, 4.0, 0F, 0F)
                    other.moveTo(8.0, 100.0, 4.0, 0F, 0F)
                    ownerLease = TestWorld.mockOwner(server, player); otherLease = TestWorld.mockOwner(server, other)
                    PokemonServerChecks.initializeTestData(player.uuid); PokemonServerChecks.initializeTestData(other.uuid)
                    individual = PokemonProperties.parse("bulbasaur level=20").create()
                    stranger = PokemonProperties.parse("ivysaur level=20").create()
                    check(Cobblemon.storage.getParty(player).add(individual))
                    check(Cobblemon.storage.getParty(other).add(stranger))
                    individual.persistentData.putString("OtherMod", "preserved")
                    individual.persistentData.put("WorldCombat", CompoundTag().also { it.putString("Preferences", "existing") })
                }
                15 -> {
                    check(individual.entity == null)
                    val inspect = request(server, "inspect")
                    check(inspect.code() == "ok" && JsonParser.parseString(inspect.data()).asJsonObject["id"].asString == individual.uuid.toString())
                    check(request(server, "inspect", stranger.uuid).code() == "not-owned-party")
                    check(request(server, "chain").code() == "ok")
                    check(NativeContentData.read(individual, KEY) == "{\"n\":2}")
                    check(request(server, "stale").data() == "{\"changed\":false}")
                    check(request(server, "rollback").code() == "invalid-data")
                    check(NativeContentData.read(individual, KEY) == "{\"n\":2}")
                    check(request(server, "retain").code() == "ok")
                    check(runCatching { retained!!.data(KEY) }.exceptionOrNull() is ActionInactiveException)
                    check(individual.persistentData.getString("OtherMod") == "preserved")
                    check(individual.persistentData.getCompound("WorldCombat").getString("Preferences") == "existing")
                    val saved = Pokemon.loadFromNBT(server.registryAccess(), individual.saveToNBT(server.registryAccess()))
                    check(NativeContentData.read(saved, KEY) == "{\"n\":2}")
                    val values = NativeContentChannels.process(player, ContentRequest(CompanionControl.session(player).id, ++sequence,
                        CombatServices.CONTENT.epoch(), server.tickCount.toLong(), "checks:public_values", individual.uuid, "{}"))
                    check(values.code() == "ok") { "Public attribute request failed: ${values.code()} ${values.data()}" }
                    check(JsonParser.parseString(values.data()).asJsonObject["haste"].asDouble == 0.0)

                    println("P5CHECK recalled party, ownership, chained CAS, rollback, scope and native save passed")
                }
                40 -> {
                    val session = CompanionControl.session(player)
                    val packet = ContentRequest(session.id, ++sequence, CombatServices.CONTENT.epoch(), server.tickCount.toLong(), "checks:content", individual.uuid, "{\"operation\":\"inspect\"}")
                    check(NativeContentChannels.process(player, packet).code() == "ok")
                    check(NativeContentChannels.process(player, packet).code() == "old-request")
                    check(NativeContentChannels.process(player, ContentRequest(UUID.randomUUID(), ++sequence, packet.epoch(), packet.observedTick(), packet.channel(), packet.pokemon(), packet.input())).code() == "stale-session")
                    check(NativeContentChannels.process(player, ContentRequest(session.id, ++sequence, packet.epoch(), packet.observedTick() - 61, packet.channel(), packet.pokemon(), packet.input())).code() == "stale-request")
                    check(NativeContentChannels.process(player, ContentRequest(session.id, ++sequence, packet.epoch(), packet.observedTick(), "checks:missing", packet.pokemon(), "{}")).code() == "channel-unavailable")
                    check(NativeContentChannels.process(player, ContentRequest(session.id, ++sequence, packet.epoch(), packet.observedTick(), packet.channel(), packet.pokemon(), "[]")).code() == "invalid-data")
                    val buffer = RegistryFriendlyByteBuf(Unpooled.buffer(), server.registryAccess())
                    try {
                        ContentRequest.CODEC.encode(buffer, packet)
                        check(ContentRequest.CODEC.decode(buffer) == packet)
                        buffer.clear()
                        val reply = ContentReply(session.id, sequence, packet.epoch(), packet.channel(), packet.pokemon(), "ok", "{\"n\":2}")
                        ContentReply.CODEC.encode(buffer, reply)
                        check(ContentReply.CODEC.decode(buffer) == reply)
                    } finally { buffer.release() }
                    check(NativeContentData.canonical("{\"z\":[2,1],\"a\":1.00}") == "{\"a\":1,\"z\":[2,1]}")
                    check(runCatching { NativeContentData.canonical("{\"a\":[] } trailing") }.isFailure)
                    val large = "{\"text\":\"" + "内容🟢".repeat(18000) + "\"}"
                    val additions = (0..900).associate { "checks:key_$it" to NativeContentData.Change(null, if (it == 900) large else "{}") }
                    check(NativeContentData.compare(individual, additions))
                    val bytes = java.io.ByteArrayOutputStream()
                    java.io.DataOutputStream(bytes).use { net.minecraft.nbt.NbtIo.write(individual.persistentData, it) }
                    val roundTrip = java.io.DataInputStream(java.io.ByteArrayInputStream(bytes.toByteArray())).use { net.minecraft.nbt.NbtIo.read(it) }
                    check(roundTrip == individual.persistentData)
                    val savedLarge = Pokemon.loadFromNBT(server.registryAccess(), individual.saveToNBT(server.registryAccess()))
                    check(NativeContentData.read(savedLarge, "checks:key_900") == large)
                    check(request(server, "remove").code() == "ok" && NativeContentData.read(individual, KEY) == null)
                    if (java.lang.Boolean.getBoolean("worldcombat.check.skillsRetired")) {
                        // The play profile installs the formal move units; the archived light resource stays out of the channel.
                        val catalogue = NativeContentChannels.process(player, ContentRequest(session.id, ++sequence, packet.epoch(), server.tickCount.toLong(), "world_combat:skills", individual.uuid, "{\"op\":\"inspect\"}"))
                        check(catalogue.code() == "ok")
                        val details = com.google.gson.JsonParser.parseString(catalogue.data()).asJsonObject
                        val supported = details.getAsJsonArray("supportedMoves")
                        check(!supported.isEmpty) { "play profile installs no skills" }
                        check(!catalogue.data().contains("\"light\"") && !catalogue.data().contains("\"maxLight\""))
                        println("P5CHECK play skill catalogue supports ${supported.size()} moves in the real native party UI channel; no light resource leaked")
                    }
                    entity = individual.sendOut(server.overworld(), Vec3(2.0, 100.0, 2.0), null)!!
                    val ordinary = net.minecraft.world.entity.EntityType.COW.create(server.overworld())!!
                    check(ordinary.getAttribute(dev.worldcombat.core.world.PublicAttributes.SKILL_HASTE) != null)
                    ordinary.getAttribute(dev.worldcombat.core.world.PublicAttributes.SKILL_HASTE)!!.baseValue = 20.0
                    check(ordinary.getAttributeValue(dev.worldcombat.core.world.PublicAttributes.SKILL_HASTE) == 20.0)
                    check(player.getAttribute(dev.worldcombat.core.world.PublicAttributes.HEALING_RECEIVED) != null)
                    val haste = entity.getAttribute(dev.worldcombat.core.world.PublicAttributes.SKILL_HASTE)!!
                    haste.baseValue = 50.0
                    haste.addPermanentModifier(net.minecraft.world.entity.ai.attributes.AttributeModifier(net.minecraft.resources.ResourceLocation.parse("checks:equipment"), 25.0, net.minecraft.world.entity.ai.attributes.AttributeModifier.Operation.ADD_VALUE))
                    haste.addTransientModifier(net.minecraft.world.entity.ai.attributes.AttributeModifier(net.minecraft.resources.ResourceLocation.parse("checks:temporary"), 10.0, net.minecraft.world.entity.ai.attributes.AttributeModifier.Operation.ADD_VALUE))
                    check(haste.value == 85.0)
                    println("P5CHECK replay, session, channel, codecs and large chunked NBT content storage passed")
                }
                65 -> {
                    val combat = CombatServices.get(server)
                    val handle = combat.bind(entity)
                    var alive = true
                    val guard = Runnable { if (!alive) throw ActionInactiveException("expired test observation") }
                    val readOnly = WorldAccess(combat.runtime(), handle, player.uuid, guard, false, 0)
                    val writable = WorldAccess(combat.runtime(), handle, player.uuid, guard, true, 0)
                    check(NativeContentData.data(readOnly, handle, KEY) == null)
                    check(runCatching { NativeContentData.compareData(readOnly, handle, KEY, null, "{}") }.isFailure)
                    check(NativeContentData.compareData(writable, handle, KEY, null, "{\"n\":2}"))
                    check(!NativeContentData.compareData(writable, handle, KEY, null, "{}"))
                    check(runCatching { NativeContentData.compareData(writable, handle, "unnamespaced", null, "{}") }.isFailure)
                    alive = false
                    check(runCatching { NativeContentData.data(readOnly, handle, KEY) }.exceptionOrNull() is ActionInactiveException)
                    individual.recall()
                    val savedNative = Pokemon.loadFromNBT(server.registryAccess(), individual.saveToNBT(server.registryAccess()))
                    val snapshot = dev.worldcombat.cobblemon.script.NativePublicAttributes.snapshot(savedNative).getValue("world_combat:skill_haste")
                    check(snapshot.base() == 50.0 && snapshot.value() == 75.0) { "Native permanent modifier or base lost on recall" }
                    check(request(server, "transfer").code() == "request-expired")
                    check(NativeContentData.read(individual, "checks:ownership") == null)
                    check(NativeContentData.read(individual, KEY) == "{\"n\":2}")
                    check(Cobblemon.storage.getParty(other).remove(individual))
                    check(Cobblemon.storage.getParty(player).add(individual))
                    entity = individual.sendOut(server.overworld(), Vec3(2.0, 100.0, 2.0), null)!!
                    check(NativeContentData.compare(individual, mapOf("checks:independent_launch" to NativeContentData.Change(null, "{\"launch\":true}"))))
                    println("P5CHECK world write permissions, namespaced keys, observation expiry and ownership recheck passed")
                }
                80 -> {
                    check(NativeContentData.read(individual, "checks:independent_done") == "{\"done\":true}")
                    check(entity.getAttributeValue(dev.worldcombat.core.world.PublicAttributes.SKILL_HASTE) == 75.0)
                    println("P5CHECK public attributes: vanilla base/permanent/transient modifiers, recall/save and restored script values passed")
                    println("P5CHECK independent native action and real Minecraft effect consumption passed")
                }
                90 -> {
                    val session = CompanionControl.session(player)
                    val oldEpoch = CombatServices.CONTENT.epoch()
                    CombatServices.CONTENT.begin(); CombatServices.CONTENT.complete(true)
                    check(NativeContentChannels.process(player, ContentRequest(session.id, ++sequence, oldEpoch, server.tickCount.toLong(), "checks:content", individual.uuid, "{}")).code() == "stale-content")
                    check(request(server, "inspect").code() == "channel-unavailable")
                    check(NativeContentData.read(individual, KEY) == "{\"n\":2}")
                    ownerLease?.close(); otherLease?.close(); done = true
                    println("P5CHECK PASS native individual content and owned-party channels")
                }
            }
        } catch (error: Throwable) {
            done = true
            ownerLease?.close(); otherLease?.close()
            println("P5CHECK FAIL native content ${error.message}"); error.printStackTrace()
        }
    }

    private fun request(server: MinecraftServer, operation: String, uuid: UUID = individual.uuid): ContentReply =
        NativeContentChannels.process(player, ContentRequest(CompanionControl.session(player).id, ++sequence,
            CombatServices.CONTENT.epoch(), server.tickCount.toLong(), "checks:content", uuid, "{\"operation\":\"$operation\"}"))
}
