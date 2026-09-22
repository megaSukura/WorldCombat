package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.*
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

object InputServerChecks {
    private var age = 0
    private var done = false
    private lateinit var actor: PokemonEntity
    private lateinit var target: Cow
    private lateinit var player: ServerPlayer
    private var mock: AutoCloseable? = null
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        try {
            val combat = CombatServices.get(server)
            if (::player.isInitialized) CompanionControl.advance(CompanionControl.session(player))
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "P2InputCheck"))
                    player.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                    mock = TestWorld.mockOwner(server, player)
                    val pokemon = PokemonProperties.parse("bulbasaur level=6").create()
                    P2Loadout.install(pokemon)
                    Cobblemon.storage.getParty(player).add(pokemon)
                    actor = pokemon.sendOut(level, Vec3(2.0, 100.0, 2.0), null) {
                        it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
                    } ?: error("Send-out failed")
                    target = TestWorld.mob(EntityType.COW, level, 9.0)
                }
                20 -> {
                    val handle = combat.bind(actor)
                    val s = CompanionControl.session(player)
                    fun send(seq: Long, generation: Long = handle.generation(), actorId: UUID = handle.entity(), version: String = CompanionControl.snapshot(s).skills()[0].version()) {
                        CompanionControl.request(player, ControlCommand(s.id, seq, CombatServices.CONTENT.epoch(), server.tickCount.toLong(),
                            actorId, generation, 0, "cast", 0, target.uuid, MinecraftCombat.point(target.boundingBox.center), Point(1.0, 0.0, 0.0), version))
                    }
                    send(1, handle.generation() + 1)
                    check(s.reason == "actor-changed" && combat.runtime().stats().instances() == 0)
                    send(2, actorId = target.uuid)
                    check(s.reason == "actor-changed" && combat.runtime().stats().instances() == 0)
                    send(3, version = "stale")
                    check(s.reason == "content-mismatch")
                    send(4)
                    check(s.reason == "accepted" && combat.runtime().stats().instances() == 1)
                    send(4)
                    check(combat.runtime().stats().instances() == 1 && s.gate.lastSequence() == 4L)
                    val state = CompanionControl.snapshot(s)
                    check(state.entityId() == actor.id && state.skills()[0].available() && state.stage() == "preparing")
                    println("P2CHECK normal owner request, generation, version and replay passed")
                }
                50 -> {
                    check(target.health < 10F && target.health > 0F) { "Player input did not execute the script" }
                    TestWorld.clean(combat)
                    val handle = combat.bind(actor)
                    check(combat.runtime().state(handle).stage() == "finished")
                    check(combat.runtime().cooldown(handle, "cobblemon_world_combat:bolt") > 0)
                    sendSkill(server, 1, actor.uuid, combat.position(handle))
                    check(CompanionControl.session(player).reason == "accepted")
                }
                52 -> {
                    sendSkill(server, 3, ControlCommand.NONE, Point(6.0, combat.position(combat.bind(actor)).y(), 2.0))
                    check(CompanionControl.session(player).reason == "queued")
                    sendSkill(server, 2, ControlCommand.NONE, Point(6.0, 100.0, 4.0))
                    check(CompanionControl.session(player).pending?.value() == 2)
                }
                65 -> {
                    val s = CompanionControl.session(player)
                    check(s.pending == null && s.reason == "queue-expired")
                    check(combat.runtime().cooldown(combat.bind(actor), "cobblemon_world_combat:wall") == 0L)
                    check(combat.runtime().cooldown(combat.bind(actor), "cobblemon_world_combat:dash") == 0L)
                    val handle = combat.bind(actor)
                    actor.pokemon.recall()
                    check(!combat.valid(handle) && combat.runtime().effects().query(handle, "world_combat:shield").size == 0)
                    TestWorld.clean(combat)
                    mock?.close(); mock = null
                    done = true
                    println("P2CHECK PASS input: owner, requests, scripted damage, replacing queue, expiry without cost and recall")
                }
            }
        } catch (error: Throwable) {
            done = true; mock?.close(); mock = null
            error.printStackTrace()
            println("P2CHECK FAIL input tick=$age $error")
        }
    }
    private fun sendSkill(server: MinecraftServer, slot: Int, targetId: UUID, point: Point) {
        val combat = CombatServices.get(server)
        val handle = combat.bind(actor)
        val s = CompanionControl.session(player)
        CompanionControl.request(player, ControlCommand(s.id, s.gate.lastSequence() + 1, CombatServices.CONTENT.epoch(), server.tickCount.toLong(),
            handle.entity(), handle.generation(), 0, "cast", slot, targetId, point, Point(1.0, 0.0, 0.0), CompanionControl.snapshot(s).skills()[slot].version()))
    }

}
