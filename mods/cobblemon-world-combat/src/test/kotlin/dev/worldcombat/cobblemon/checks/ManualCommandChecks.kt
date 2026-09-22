package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.network.ControlCommand
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.Mob
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Native owner/party, real command ingress and pathfinding; private neutral actions own no gameplay balance. */
object ManualCommandChecks {
    private const val SLOW = "checks:manual/slow"
    private const val FAST = "checks:manual/fast"
    private var age = 0
    private var phase = 0
    private var phaseAt = 0
    private var done = false
    private var slowCasts = 0
    private var fastCasts = 0
    private var slowCommittedAt = -1L
    private var verifiedLongWait = false
    private var retainedPathExits = 0
    private var queuedSequence = -1L
    private var ppBefore = 0
    private lateinit var player: ServerPlayer
    private lateinit var subject: PokemonEntity
    private lateinit var target: Mob
    private lateinit var session: CompanionControl.Session
    private lateinit var began: Vec3
    private var ownerLease: AutoCloseable? = null

    @JvmStatic fun committed(id: String, distance: Double, at: Long) {
        check(distance <= 3.0001) { "Queued cast committed outside its true range: $distance" }
        when (id) {
            SLOW -> {
                if (slowCasts > 0) check(at - slowCommittedAt >= 180) { "Native cooldown was bypassed" }
                slowCasts++; slowCommittedAt = at
            }
            FAST -> fastCasts++
            else -> error("Unexpected fixture action $id")
        }
    }

    @JvmStatic fun taskExit(hadPath: Boolean, keptPath: Boolean) {
        check(hadPath && keptPath) { "Previous task exit stopped the new manual navigation" }
        retainedPathExits++
    }

    private fun request(operation: String, slot: Int = 0) {
        val body = checkNotNull(session.actor)
        val snapshot = CompanionControl.snapshot(session)
        val at = Point(target.x, target.y + target.bbHeight / 2, target.z)
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1,
            session.epoch, player.server.tickCount.toLong(), body.entity(), body.generation(), session.partySlot,
            operation, slot, target.uuid, at, Point(1.0, 0.0, 0.0), snapshot.skills()[slot].version(), "{}"))
    }

    private fun next(value: Int) { phase = value; phaseAt = age }
    private fun elapsed() = age - phaseAt
    private fun waiting(): Boolean = session.pending != null && session.body.approaching
    private fun cleanup() {
        if (::subject.isInitialized) subject.discard()
        if (::target.isInitialized) target.discard()
        ownerLease?.close(); ownerLease = null
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        age++
        val combat = CombatServices.get(server)
        try {
            check(age < 750) { "Manual integration timed out at phase $phase: ${if (::session.isInitialized) session.reason else "setup"}" }
            if (phase == 0) {
                check(CombatServices.CONTENT.get(SLOW) != null && CombatServices.CONTENT.get(FAST) != null) {
                    "Load base content and tests/content/manual-command-check.js before running this check"
                }
                val level = TestWorld.prepare(server)
                player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "ManualCommandCheck"))
                player.moveTo(2.0, 100.0, 4.0, 0f, 0f)
                ownerLease = TestWorld.mockOwner(server, player)
                PokemonServerChecks.initializeTestData(player.uuid)
                val pokemon = PokemonProperties.parse("bulbasaur level=30").create()
                pokemon.moveSet.clear(); pokemon.moveSet.setMove(0, checkNotNull(Moves.getByName("splash")).create())
                pokemon.moveSet.setMove(1, checkNotNull(Moves.getByName("tackle")).create())
                check(Cobblemon.storage.getParty(player).add(pokemon)) { "Could not add owned fixture Pokemon" }
                subject = checkNotNull(pokemon.sendOut(level, Vec3(2.0, 100.0, 2.0), null))
                target = TestWorld.mob(EntityType.COW, level, 14.0)
                session = CompanionControl.session(player)
                next(1)
            }
            CompanionControl.advance(session)
            when (phase) {
                1 -> if (elapsed() >= 50) {
                    check(subject.onGround()) { "Companion did not settle on the native walking platform" }
                    val memory = JsonParser.parseString(session.body.memory).asJsonObject
                    check(memory.has("entered") && memory.get("entered").asInt > 0) { "Previous task was never active" }
                    began = subject.position()
                    ppBefore = subject.pokemon.moveSet.get(0)!!.currentPp
                    request("cast")
                    check(waiting() && slowCasts == 0) { "Distant command failed to queue before casting: ${session.reason}" }
                    check(subject.pokemon.moveSet.get(0)!!.currentPp == ppBefore) { "Approach spent native PP before casting" }
                    next(2)
                }
                2 -> {
                    check(elapsed() <= 160) { "Approach did not execute: ${session.reason}; at=${subject.position()}" }
                    if (slowCasts == 1) {
                        check(subject.position().distanceTo(began) > 1.0) { "Out-of-range order cast without approaching" }
                        check(retainedPathExits > 0) { "Previous task did not exit while manual navigation was active" }
                        check(session.pending == null) { "Started command remained queued" }
                        check(subject.pokemon.moveSet.get(0)!!.currentPp == ppBefore - 1) { "First command did not spend one native PP" }
                        request("cast")
                        check(waiting() && session.reason == "waiting-cooldown") { "Cooldown order was refused: ${session.reason}" }
                        queuedSequence = checkNotNull(session.pending).sequence()
                        println("P5CHECK manual: walked into range; task exit preserved the live path")
                        next(3)
                    }
                }
                3 -> {
                    if (elapsed() == 110) {
                        check(waiting() && session.pending!!.sequence() == queuedSequence && slowCasts == 1) {
                            "Cooldown command expired after five seconds: ${session.reason}"
                        }
                        check(combat.runtime().cooldown(session.actor, SLOW) > 0) { "Long-wait fixture no longer has cooldown" }
                        check(subject.pokemon.moveSet.get(0)!!.currentPp == ppBefore - 1) { "Waiting spent native PP" }
                        verifiedLongWait = true
                    }
                    check(elapsed() <= 210) { "Queued cooldown action never started: ${session.reason}" }
                    if (slowCasts == 2) {
                        check(verifiedLongWait && elapsed() >= 170) { "Cooldown bypassed or long wait was not observed" }
                        check(session.pending == null) { "Cooldown completion left its old command pending" }
                        request("cast")
                        check(waiting()) { "Second cooldown command did not queue" }
                        request("cancel-cast")
                        check(!waiting() && session.pending == null && session.reason == "cancelled") { "Waiting command did not cancel" }
                        println("P5CHECK manual: same request survived >5s and cast when ready; next wait cancelled")
                        next(4)
                    }
                }
                4 -> if (elapsed() >= 190) {
                    check(slowCasts == 2 && session.pending == null) { "Cancelled wait cast after cooldown elapsed" }
                    check(subject.pokemon.moveSet.get(0)!!.currentPp == ppBefore - 2) { "Cancelled wait spent PP or submitted twice" }
                    combat.stopMovement(checkNotNull(session.actor))
                    subject.moveTo(2.0, 100.0, 2.0, 0f, 0f)
                    target.moveTo(14.0, 100.0, 2.0, 0f, 0f)
                    request("cast", 1)
                    check(waiting() && fastCasts == 0) { "Cancellable approach did not queue" }
                    next(5)
                }
                5 -> if (elapsed() >= 3) {
                    check(waiting() && !subject.navigation.isDone && fastCasts == 0) { "Cancellation fixture lacks a live pending path" }
                    request("cancel-cast", 1)
                    check(session.pending == null && !session.body.approaching && subject.navigation.isDone) {
                        "Cancel did not release pending navigation"
                    }
                    next(6)
                }
                6 -> if (elapsed() >= 20) {
                    check(fastCasts == 0 && slowCasts == 2 && session.pending == null) { "Cancelled command executed later" }
                    check(retainedPathExits > 0 && verifiedLongWait)
                    println("P5CHECK PASS manual commands: range approach, native navigation survives task exit, 180-tick cooldown wait, automatic cast and cancellation while waiting/walking")
                    done = true; cleanup(); server.halt(false)
                }
            }
        } catch (failure: Throwable) {
            done = true
            println("P5CHECK FAIL manual commands at phase=$phase age=$age: $failure")
            failure.printStackTrace()
            runCatching { cleanup() }
            server.halt(false)
        }
    }
}
