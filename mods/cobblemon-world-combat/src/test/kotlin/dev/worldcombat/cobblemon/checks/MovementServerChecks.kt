package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatGeometry
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Reproduce the playtest handoff from scripted horizontal motion to native walking. */
object MovementServerChecks {
    private var age = 0
    private var phase = 0
    private var finishedAt = 0
    private var done = false
    private lateinit var actor: PokemonEntity
    private lateinit var player: ServerPlayer
    private lateinit var session: CompanionControl.Session
    private var dashEnd = Vec3.ZERO
    private var mock: AutoCloseable? = null

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        age++
        val combat = CombatServices.get(server)
        try {
            if (age == 1) {
                val level = TestWorld.prepare(server)
                val owner = UUID.randomUUID()
                PokemonServerChecks.initializeTestData(owner)
                player = FakePlayerFactory.get(level, GameProfile(owner, "P2MovementCheck"))
                player.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                mock = TestWorld.mockOwner(server, player)
                val pokemon = PokemonProperties.parse("bulbasaur level=6").create()
                P2Loadout.install(pokemon)
                Cobblemon.storage.getParty(player).add(pokemon)
                actor = pokemon.sendOut(level, Vec3(2.0, 100.0, 2.0), null) {
                    it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
                } ?: error("Send-out failed")
                session = CompanionControl.session(player)
            }
            if (age > 1) CompanionControl.advance(session)
            if (age == 20) {
                session.permissions = 0
                actor.setNoAi(false); actor.setNoGravity(false)
            }
            if (age == 25 || age == 110) {
                check(actor.onGround()) { "Walking fixture is not grounded" }
                session.intent = if (age == 25) "hold" else "follow"
                session.intentPoint = if (age == 25) Point(2.0, 100.0, 2.0) else null
                val point = Point(actor.x + 5.5, combat.position(combat.bind(actor)).y(), actor.z)
                val preview = CombatGeometry.motionEnd(actor, point, 6.0, true)
                check(preview.distanceTo(Vec3(point.x(), actor.y, point.z())) < 0.01) { "Flat preview clipped without an obstacle" }
                val handle = combat.bind(actor)
                if (age == 110) session.blockedUntil = combat.runtime().now() + 40L
                CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1, CombatServices.CONTENT.epoch(),
                    server.tickCount.toLong(), handle.entity(), handle.generation(), 0, "cast", 3, ControlCommand.NONE,
                    point, Point(1.0, 0.0, 0.0), CompanionControl.snapshot(session).skills()[3].version()))
                check(session.reason == "accepted")
                phase = if (age == 25) 1 else 3
                finishedAt = 0
            }
            if (phase == 1 || phase == 3) {
                if (finishedAt == 0 && !combat.runtime().busy(session.actor)) {
                    check(combat.runtime().state(session.actor).stage() == "finished") { "Flat dash was rejected" }
                    finishedAt = age; dashEnd = actor.position()
                }
                if (finishedAt > 0 && age == finishedAt + 2) {
                    check(session.reason != "path-blocked" && session.blockedUntil <= combat.runtime().now()) {
                        "Flat dash delayed walking: intent=${session.intent}, reason=${session.reason}, ground=${actor.onGround()}, retry=${session.blockedUntil - combat.runtime().now()}"
                    }
                    check(session.behaviorStage == "approaching") { "Persistent intent did not resume after the dash" }
                }
                if (finishedAt > 0 && age == finishedAt + 15) {
                    check(actor.x < dashEnd.x - 0.5) { "Partner did not start walking back after the dash: start=$dashEnd end=${actor.position()} speed=${actor.speed} attribute=${actor.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.MOVEMENT_SPEED)} path=${actor.navigation.path} done=${actor.navigation.isDone} stage=${session.behaviorStage} reason=${session.reason} memory=${session.body.memory}" }
                    println("P2CHECK flat dash preview and immediate ${session.intent} movement passed")
                    if (phase == 3) {
                        actor.pokemon.recall(); TestWorld.clean(combat)
                        mock?.close(); mock = null; done = true
                        println("P2CHECK PASS movement: flat preview, dash, hold and follow resume without blocked delay")
                    } else phase = 2
                }
            }
            check(age < 160) { "Movement check timed out" }
        } catch (error: Throwable) {
            done = true; mock?.close(); mock = null
            error.printStackTrace()
            println("P2CHECK FAIL movement age=$age $error")
        }
    }
}
