package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.events.CobblemonEvents
import com.cobblemon.mod.common.api.pokeball.PokeBalls
import com.cobblemon.mod.common.api.pokeball.catching.CaptureContext
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.entity.pokeball.EmptyPokeBallEntity
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.*
import dev.worldcombat.cobblemon.network.*
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.*
import net.minecraft.commands.arguments.EntityAnchorArgument
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.InteractionHand
import net.minecraft.world.item.ItemStack
import net.minecraft.world.phys.Vec3
import net.minecraft.world.level.storage.LevelResource
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

object TacticsCaptureChecks {
    private var age = 0
    private var holdReadyAt = 0
    private var phase = 0
    private var done = false
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private lateinit var ball: EmptyPokeBallEntity
    private lateinit var player: ServerPlayer
    private lateinit var session: CompanionControl.Session
    private lateinit var oldTarget: ActorHandle
    private var oldHp = 0
    private var expectSuccess = false
    private var captures = 0
    private var captureBegan = 0
    private var rewardBefore = 0
    private var expectedReward = 0
    private var rewardEvents = 0
    private var mock: AutoCloseable? = null
    private var unsubscribeResult: (() -> Unit)? = null
    private var unsubscribeCapture: (() -> Unit)? = null

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        age++
        val combat = CombatServices.get(server)
        try {
            if (age == 1) {
                val level = TestWorld.prepare(server)
                val id = UUID.randomUUID()
                PokemonServerChecks.initializeTestData(id)
                player = FakePlayerFactory.get(level, GameProfile(id, "P2CaptureCheck"))
                player.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                mock = TestWorld.mockOwner(server, player)
                val pokemon = PokemonProperties.parse("bulbasaur level=6").create()
                Cobblemon.storage.getParty(player).add(pokemon)
                actor = send(pokemon, server, 2.0)
                target = send(PokemonProperties.parse("rattata level=3").create(), server, 8.0)
                session = CompanionControl.session(player)
                val result = CobblemonEvents.POKE_BALL_CAPTURE_CALCULATED.subscribe {
                    if (it.thrower === player) it.captureResult = CaptureContext(0, expectSuccess, false)
                }
                val captured = CobblemonEvents.POKEMON_CAPTURED.subscribe { if (it.player === player) captures++ }
                unsubscribeResult = { result.unsubscribe() }; unsubscribeCapture = { captured.unsubscribe() }
            }
            if (age > 1 && phase == 0) CompanionControl.advance(session)
            if (age == 20) {
                session.permissions = 0
                request("cast", 0, combat)
                check(session.reason == "accepted")
                val active = combat.runtime().state(session.actor).instance()
                CompanionTactics.tick(session, combat)
                check(combat.runtime().state(session.actor).instance() == active) { "AI replaced manual preparation" }
            }
            if (age == 55) {
                oldHp = target.pokemon.currentHealth; check(oldHp < target.pokemon.maxHealth)
                actor.setNoAi(false); actor.setNoGravity(false)
            }
            if (age == 58) {
                check(actor.onGround()) { "Walking fixture did not settle on its platform" }
                session.intent = "hold"; session.intentPoint = Point(5.0, 100.0, 2.0)
            }
            if (age >= 85 && holdReadyAt == 0) {
                check(target.pokemon.currentHealth == oldHp) { "Disabled AI slot still attacked" }
                if (actor.position().distanceTo(Vec3(5.0, 100.0, 2.0)) >= 1.5 || session.behaviorStage != "idle") {
                    check(age < 155) { "Controlled native navigation did not settle at the hold point: ${actor.position()}" }
                    return
                }
                holdReadyAt = age
                actor.setNoAi(true); actor.setNoGravity(true); actor.moveTo(2.0, 100.0, 2.0, 0F, 0F); actor.deltaMovement = Vec3.ZERO
                session.intent = "follow"; session.intentPoint = null
                session.tactics = "autonomous"; session.permissions = 1
            }
            if (holdReadyAt > 0 && age == holdReadyAt + 30) {
                check(target.pokemon.currentHealth < oldHp) { "Authorized script AI did not attack" }
                session.permissions = 0; combat.runtime().cancelActor(combat.bind(actor), "fixture-transition")
                target.pokemon.heal(); target.invulnerableTime = 0
                request("capture", 0, combat)
                check(session.captureHold == target.pokemon.uuid)
                session.permissions = 1
                oldHp = target.pokemon.currentHealth
            }
            if (holdReadyAt > 0 && age == holdReadyAt + 55) {
                check(target.pokemon.currentHealth == oldHp) { "Capture preparation did not reserve the target" }
                session.permissions = 0
                session.tactics = "autonomous"; session.chaseRange = 18; session.permissions = 9
                CompanionTactics.save(session, combat)
                val saved = actor.pokemon.saveToNBT(server.registryAccess())
                val restored = com.cobblemon.mod.common.pokemon.Pokemon().loadFromNBT(server.registryAccess(), saved)
                check(restored.persistentData.getCompound("WorldCombat").getInt("Permissions") == 9)
                session.permissions = 0
                oldTarget = combat.bind(target)
                throwBall()
                captureBegan = age
                phase = 1
                println("P2CHECK manual priority, native hold navigation, script AI permissions, capture preparation and native settings NBT passed")
            }
            if (phase == 1 && age == captureBegan + 12) {
                check(ball.capturingPokemon === target && target.isBusy) { "Native item throw did not hit the target: state=${ball.captureState} removed=${ball.isRemoved} ball=${ball.position()} target=${target.position()}" }
                check(!combat.valid(oldTarget)) { "Capture kept the old combat handle active" }
                check(!combat.damage(combat.bind(actor), oldTarget, player.uuid, 99.0)) { "Combat damaged a captured target" }
                actor.pokemon.recall()
            }
            if (phase == 1 && ball.captureFuture.isDone) {
                check(!ball.captureFuture.getNow(true) && target.isAlive && !target.isBusy)
                check(target.pokemon.isWild() && captures == 0)
                check(combat.bind(target) != oldTarget) { "Failed capture reused an old handle" }
                expectSuccess = true
                oldTarget = combat.bind(target)
                throwBall(); captureBegan = age; phase = 2
                println("P2CHECK native failed capture restored its world actor without party insertion")
            }
            if (phase == 2 && ball.captureFuture.isDone) {
                check(ball.captureFuture.getNow(false) && captures == 1)
                check(Cobblemon.storage.getParty(player).count { it.uuid == target.pokemon.uuid } == 1) { "Capture inserted more than one party member" }
                check(!combat.valid(oldTarget) && target.isRemoved)
                actor = send(target.pokemon, server, 2.0)
                session.partySlot = 1
                target = send(PokemonProperties.parse("rattata level=2").create(), server, 8.0)
                target.pokemon.currentHealth = 1; target.invulnerableTime = 0
                rewardBefore = actor.pokemon.experience
                CobblemonEvents.EXPERIENCE_GAINED_EVENT_POST.subscribe {
                    if (it.pokemon === actor.pokemon) { expectedReward += it.experience; rewardEvents++ }
                }
                captureBegan = age; phase = 3
                println("P2CHECK native successful capture inserted exactly one individual and sent it out again")
            }
            if (phase == 3 && age == captureBegan + 20) {
                CompanionControl.advance(session)
                session.tactics = "autonomous"; session.permissions = 9; session.chaseRange = 18
                CompanionTactics.save(session, combat)
                request("cast", 0, combat)
                check(session.reason == "accepted")
            }
            if (phase == 3 && age == captureBegan + 55) {
                check(target.pokemon.isFainted())
                check(rewardEvents == 1 && expectedReward > 0 && actor.pokemon.experience == rewardBefore + expectedReward) { "Captured partner's reward differs" }
                check(captures == 1)
                val expected = com.google.gson.JsonObject().also {
                    it.addProperty("owner", player.uuid.toString()); it.addProperty("pokemon", actor.pokemon.uuid.toString())
                    it.addProperty("health", actor.pokemon.currentHealth); it.addProperty("experience", actor.pokemon.experience)
                    it.addProperty("level", actor.pokemon.level); it.addProperty("permissions", 9); it.addProperty("range", 18)
                }
                java.nio.file.Files.writeString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-p2-save.json"), expected.toString())
                actor.pokemon.recall()
                close(); done = true
                println("P2CHECK PASS tactics and capture: native item, failure, success, ownership, reward and saved settings")
            }
            check(age < 650) { "Native capture timed out in phase $phase: ${if (::ball.isInitialized) ball.captureState else null}" }
        } catch (error: Throwable) {
            close(); done = true; error.printStackTrace()
            println("P2CHECK FAIL tactics and capture age=$age phase=$phase $error")
        }
    }
    private fun request(operation: String, slot: Int, combat: MinecraftCombat) {
        val actor = combat.bind(actor)
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1, CombatServices.CONTENT.epoch(),
            player.server.tickCount.toLong(), actor.entity(), actor.generation(), session.partySlot, operation, slot, target.uuid,
            combat.position(combat.bind(target)), Point(1.0, 0.0, 0.0), CompanionControl.snapshot(session).skills()[slot].version()))
    }
    private fun throwBall() {
        player.lookAt(EntityAnchorArgument.Anchor.EYES, target.boundingBox.center)
        player.xRot += 5F
        val item = PokeBalls.POKE_BALL.item()
        player.setItemInHand(InteractionHand.MAIN_HAND, ItemStack(item, 2))
        item.use(player.level(), player, InteractionHand.MAIN_HAND)
        check(player.mainHandItem.count == 1) { "Native throw did not consume a ball" }
        ball = player.serverLevel().getEntitiesOfClass(EmptyPokeBallEntity::class.java, player.boundingBox.inflate(32.0))
            .filter { it.owner === player }.maxBy { it.id }
        // Stabilize the fixture trajectory before native collision and capture processing.
        ball.setPos(target.boundingBox.center.add(-1.0, 0.0, 0.0))
        ball.deltaMovement = Vec3(0.9, 0.0, 0.0)
    }
    private fun send(pokemon: com.cobblemon.mod.common.pokemon.Pokemon, server: MinecraftServer, x: Double): PokemonEntity =
        pokemon.also(P2Loadout::install).sendOut(server.overworld(), Vec3(x, 100.0, 2.0), null) {
            it.setNoAi(true); it.setNoGravity(true); it.setPersistenceRequired()
        } ?: error("Native send-out failed")
    private fun close() {
        unsubscribeCapture?.invoke(); unsubscribeResult?.invoke()
        unsubscribeCapture = null; unsubscribeResult = null
        mock?.close(); mock = null
    }
}
