package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.*
import dev.worldcombat.cobblemon.network.*
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.checks.WorkshopServerChecks
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.*
import dev.worldcombat.core.network.SceneState
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

object WorkshopNativeChecks {
    private var age = 0; private var done = false
    private lateinit var first: PokemonEntity; private lateinit var second: PokemonEntity; private lateinit var player: ServerPlayer
    private lateinit var victim: PokemonEntity
    private var healthBefore = 0
    private lateinit var session: CompanionControl.Session
    private var mock: AutoCloseable? = null
    private fun request(operation: String, slot: Int, input: String = "{}", version: String? = null) {
        val actor = session.actor!!; val binding = CompanionContent.resolve(actor, slot)
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1, session.epoch, player.server.tickCount.toLong(),
            actor.entity(), actor.generation(), session.partySlot, operation, slot, ControlCommand.NONE, Point(8.0,100.3,2.0), Point(1.0,0.0,0.0), version ?: binding.version, input))
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server); val runtime = combat.runtime()
        try {
            if (age > 0) CompanionControl.advance(session)
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P4Workshop")); player.moveTo(2.0,100.0,4.0,0F,0F)
                    mock = TestWorld.mockOwner(server, player); PokemonServerChecks.initializeTestData(player.uuid)
                    fun send(spec: String, x: Double): PokemonEntity {
                        val pokemon = PokemonProperties.parse(spec).create(); pokemon.moveSet.clear()
                        listOf("thundershock", "watergun", "charge", "growl").forEachIndexed { index, id -> pokemon.moveSet.setMove(index, Moves.getByName(id)!!.create()) }
                        Cobblemon.storage.getParty(player).add(pokemon)
                        return pokemon.sendOut(level, Vec3(x,100.0,2.0), null) { it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired() }!!
                    }
                    first = send("pikachu level=20", 2.0); second = send("squirtle level=20", 4.0)
                    victim = PokemonProperties.parse("squirtle level=30").create().sendOut(level, Vec3(8.0,100.0,2.0), null) {
                        it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
                        it.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.KNOCKBACK_RESISTANCE)!!.baseValue = 1.0
                    }!!
                    healthBefore = victim.pokemon.currentHealth
                    session = CompanionControl.session(player)
                }
                15 -> {
                    check(session.members.size == 2 && CompanionControl.snapshot(session).members().size == 2)
                    check(CompanionContent.resolve(combat.bind(first), 0).id == "p4:current")
                    check(CombatServices.CONTENT.get("examples:beam") == null)
                    first.pokemon.moveSet[0]!!.currentPp = 1
                    request("cast", 0, WorkshopServerChecks.input(101,8.0))
                    check(session.reason == "accepted" && first.pokemon.moveSet[0]!!.currentPp == 0)
                }
                19 -> {
                    check(victim.pokemon.currentHealth < healthBefore) { "Composed current did not settle native damage" }
                    request("input-update", 0, WorkshopServerChecks.input(101,9.0), "101")
                    check(runtime.busy(combat.bind(first))) { "Last PP invalidated a committed channel" }
                    request("input-stop", 0, version = "101")
                    check(!runtime.busy(combat.bind(first)) && first.pokemon.moveSet[0]!!.currentPp == 0)
                    val before = first.pokemon.moveSet[1]!!.currentPp
                    request("cast", 1, "{\"version\":1,\"token\":2,\"samples\":[]}")
                    check(session.reason == "invalid-input" && first.pokemon.moveSet[1]!!.currentPp == before)
                    request("cast", 1, WorkshopServerChecks.input(2,6.0,9.0,12.0))
                    check(runtime.interruptPreparation(combat.bind(first)) && first.pokemon.moveSet[1]!!.currentPp == before)
                    request("cast", 1, WorkshopServerChecks.input(3,6.0,9.0,12.0))
                }
                30 -> {
                    check(runtime.effects().query(combat.bind(first), "p4:conduit").size == 3)
                    val state = CompanionControl.snapshot(session)
                    val snapshot = SceneState(CombatServices.CONTENT.epoch(), runtime.now(), player.level().dimension().location().toString(), 1, combat.presentations().snapshot(player))
                    check(snapshot.data().contains("p4:field"))
                    val buffer = net.minecraft.network.RegistryFriendlyByteBuf(io.netty.buffer.Unpooled.buffer(), server.registryAccess())
                    try { ControlState.CODEC.encode(buffer, state); check(ControlState.CODEC.decode(buffer) == state)
                        SceneState.CODEC.encode(buffer, snapshot); check(SceneState.CODEC.decode(buffer) == snapshot)
                    } finally { buffer.release() }
                    val firstBody = session.body; firstBody.intent = "hold"
                    session.partySlot = 1; CompanionControl.advance(session)
                    check(firstBody !== session.body && firstBody.intent == "hold" && combat.controls(first))
                    second.pokemon.moveSet[0]!!.currentPp = 2
                    session.tactics = "autonomous"; session.permissions = 1
                    victim.addTag("wc_p4_target")
                }
                48 -> {
                    check(second.pokemon.moveSet[0]!!.currentPp == 1) { "Replacement AI did not use the shared complex input/native PP path" }
                    session.members.values.forEach { it.intent = "roam" }
                    runtime.reset("workshop-finished"); check(combat.presentations().size() == 0 && combat.helpers().count() == 0)
                    TestWorld.clean(combat)
                    server.playerList.op(player.gameProfile)
                    server.commands.performPrefixedCommand(player.createCommandSourceStack().withPermission(4), "function worldcombat:p4_setup")
                }
                55 -> {
                    val count = (0..5).count { Cobblemon.storage.getParty(player).get(it) != null }
                    check(count == 4) { "Playtest setup did not provide both partners: count=$count" }
                    check(player.serverLevel().getEntitiesOfClass(net.minecraft.world.entity.animal.Cow::class.java, player.boundingBox.inflate(20.0)).count { it.tags.contains("wc_p4_c") } == 1)
                    server.playerList.deop(player.gameProfile); mock?.close(); done = true
                    println("P4CHECK PASS workshop native: old samples removed, two companions, scripted AI, native PP once/cancel/last-PP, malformed input, roster and scene packet roundtrip, selection and cleanup")
                }
            }
        } catch (error: Throwable) { done = true; if (::player.isInitialized) server.playerList.deop(player.gameProfile); mock?.close(); error.printStackTrace(); println("P4CHECK FAIL workshop native age=$age $error") }
    }
}
