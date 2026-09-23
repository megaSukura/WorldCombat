package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.api.riding.RidingStyle
import com.mojang.authlib.GameProfile
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.script.PokemonScriptApi
import dev.worldcombat.cobblemon.script.PokemonView
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.ActionContext
import dev.worldcombat.core.runtime.ActionRejectedException
import dev.worldcombat.core.runtime.Point
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.server.level.ClientInformation
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.entity.ai.memory.MemoryModuleType
import net.minecraft.world.entity.ai.memory.WalkTarget
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.util.FakePlayerFactory
import java.util.UUID

/** Native driver ownership across a ground mount and an air mount; action controls leave riding physics intact. */
object NativeRidingChecks {
    private var age = 0
    private var done = false
    private lateinit var owner: ServerPlayer
    private lateinit var outsider: ServerPlayer
    private lateinit var actor: PokemonEntity
    private lateinit var target: PokemonEntity
    private var ownerLease: AutoCloseable? = null
    private var initialPp = 0
    private var initialHealth = 0
    private var walkStart = Vec3.ZERO
    private var hits = 0
    private const val RANGED = "checks:riding_ranged"
    private const val MOTION = "checks:riding_motion"

    @JvmStatic fun install() {
        val api = PokemonScriptApi()
        api.registerAction(RANGED, "1", 80, "enemy", 32.0) { action ->
            val move = api.pokemon(action.actor()).move(0)!!
            action.cost(api.ppCost(action, 0, move.key(), 1.0))
            action.face(action.targetPosition(), 20.0, 10.0)
            action.after(4) { active ->
                active.commit(1)
                active.world().health(active.target()!!, -2.0, "checks:remote")
                hits++
                active.after(8) { it.finish() }
            }
        }
        api.registerAction(MOTION, "1", 80, "enemy", 32.0) { action ->
            fun ready(current: ActionContext) {
                val facts = api.pokemon(current.actor())
                if (facts.vehicle() || facts.passenger()) current.reject("mounted-control")
            }
            ready(action)
            val move = api.pokemon(action.actor()).move(1)!!
            action.cost(api.ppCost(action, 1, move.key(), 1.0))
            action.after(8) { active ->
                ready(active)
                active.commit(1)
                active.world().displace(active.actor(), Point(1.0, 0.0, 0.0))
                active.finish()
            }
        }
    }

    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server)
        try {
            when (age++) {
                0 -> {
                    val level = TestWorld.prepare(server)
                    val profile = GameProfile(UUID.randomUUID(), "P5NativeRider")
                    val connection = FakePlayerFactory.get(level, profile).connection
                    owner = ServerPlayer(server, level, profile, ClientInformation.createDefault()).also {
                        it.connection = connection; it.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                    }
                    outsider = ServerPlayer(server, level, GameProfile(UUID.randomUUID(), "P5OtherRider"), ClientInformation.createDefault()).also {
                        it.connection = connection
                    }
                    ownerLease = TestWorld.mockOwner(server, owner)
                    PokemonServerChecks.initializeTestData(owner.uuid)
                    val pokemon = PokemonProperties.parse("venusaur level=40").create()
                    pokemon.moveSet.setMove(0, Moves.getByName("seedbomb")!!.create())
                    pokemon.moveSet.setMove(1, Moves.getByName("tackle")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(pokemon))
                    actor = pokemon.sendOut(level, Vec3(3.0, 100.0, 2.5), null)!!
                    target = PokemonProperties.parse("snorlax level=40").create().sendOut(level, Vec3(11.0, 100.0, 2.5), null)!!
                    target.setNoAi(true)
                }
                20 -> {
                    check(actor.ridingController != null && actor.seats.isNotEmpty())
                    check(actor.tryRidingPokemon(owner) && owner.vehicle === actor && actor.controllingPassenger === owner)
                    val facts = PokemonView.capture(actor)
                    check(facts.activeState() == "sent-out" && facts.vehicle() && !facts.passenger() && facts.driver() == owner.uuid.toString())
                    val session = CompanionControl.session(owner)
                    CompanionControl.advance(session)
                    check(session.actor == combat.bind(actor) && combat.mayAct(combat.bind(actor), owner.uuid))
                    actor.brain.setMemory(MemoryModuleType.WALK_TARGET, WalkTarget(Vec3(7.0, 100.0, 2.5), 0.5F, 1))
                    initialPp = actor.pokemon.moveSet[0]!!.currentPp
                    initialHealth = target.pokemon.currentHealth
                    val beforeYaw = actor.yRot
                    combat.runtime().start(RANGED, combat.bind(actor), combat.bind(target), owner.uuid)
                    check(combat.runtime().busy(combat.bind(actor)) && !combat.controls(actor))
                    check(actor.brain.hasMemoryValue(MemoryModuleType.WALK_TARGET))
                    check(actor.yRot == beforeYaw)
                    combat.stopMovement(combat.bind(actor))
                    check(actor.brain.hasMemoryValue(MemoryModuleType.WALK_TARGET))
                    check(combat.navigate(combat.bind(actor), Point(7.0, 100.0, 2.5), 0.5, 1.0) == "mounted-control")
                    check(runCatching { combat.displace(combat.bind(actor), combat.bind(actor), Point(1.0, 0.0, 0.0), owner.uuid) }
                        .exceptionOrNull().let { it is ActionRejectedException && it.reason() == "mounted-control" })
                    println("P5CHECK native rider, pose facts, retained driving control and mounted movement boundary passed")
                }
                40 -> {
                    check(hits == 1 && actor.pokemon.moveSet[0]!!.currentPp == initialPp - 1)
                    check(target.pokemon.currentHealth < initialHealth && owner.vehicle === actor && !combat.controls(actor))
                    val pp = actor.pokemon.moveSet[1]!!.currentPp
                    check(runCatching { combat.runtime().start(MOTION, combat.bind(actor), combat.bind(target), owner.uuid) }
                        .exceptionOrNull().let { it is ActionRejectedException && it.reason() == "mounted-control" })
                    check(actor.pokemon.moveSet[1]!!.currentPp == pp)
                    owner.stopRiding()
                    check(!PokemonView.capture(actor).vehicle() && PokemonView.capture(actor).driver().isEmpty())
                    combat.runtime().start(MOTION, combat.bind(actor), combat.bind(target), owner.uuid)
                    check(actor.tryRidingPokemon(owner))
                    initialPp = pp
                    println("P5CHECK mounted ranged action damages once and consumes PP; moving action rejects before PP passed")
                }
                60 -> {
                    check(combat.runtime().state(combat.bind(actor)).reason() == "mounted-control")
                    check(actor.pokemon.moveSet[1]!!.currentPp == initialPp)
                    owner.stopRiding()
                    check(outsider.startRiding(actor, true))
                    check(!combat.mayAct(combat.bind(actor), owner.uuid))
                    outsider.stopRiding()
                    CompanionControl.advance(CompanionControl.session(owner))
                    check(combat.mayAct(combat.bind(actor), owner.uuid))
                    combat.controlled(combat.bind(actor), true)
                    check(combat.controls(actor))
                    walkStart = actor.position()
                    val response = combat.navigate(combat.bind(actor), Point(7.0, 100.0, 2.5), 0.5, 1.0)
                    check(response == "moving") { "Dismounted navigation failed: $response" }
                    println("P5CHECK mounting during preparation preserves PP, foreign driver is rejected, dismount returns scripted navigation")
                }
                90 -> {
                    check(actor.position().distanceTo(walkStart) > 0.1) { "Native movement failed to resume after dismount" }
                    combat.controlled(combat.bind(actor), false)
                    check(!combat.controls(actor))
                    val pokemon = actor.pokemon
                    pokemon.recall()
                    check(PokemonView.capture(pokemon).activeState() == "inactive")
                    val flying = PokemonProperties.parse("charizard level=40").create()
                    flying.moveSet.setMove(0, Moves.getByName("seedbomb")!!.create())
                    flying.moveSet.setMove(1, Moves.getByName("tackle")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(flying))
                    actor = flying.sendOut(owner.serverLevel(), Vec3(3.0, 125.0, 2.5), null)!!
                }
                110 -> {
                    actor.moveTo(3.0, 125.0, 2.5, 35F, -12F)
                    actor.setOnGround(false)
                    check(actor.tryRidingPokemon(owner))
                    val riding = actor.ridingController!!
                    val air = riding.behaviours[RidingStyle.AIR] ?: error("Air riding fixture needs an air behaviour")
                    riding.changeBehaviour(air.key)
                    val flightContext = riding.context ?: error("Air controller did not establish a riding context")
                    flightContext.state.rideVelocity.set(Vec3(0.25, 0.12, 0.0), true)
                    actor.deltaMovement = Vec3(0.25, 0.12, 0.0)
                    val facts = PokemonView.capture(actor)
                    check(facts.ridingStyle() == "air" && !facts.grounded())
                    check(combat.mayAct(combat.bind(actor), owner.uuid))
                    target.moveTo(11.0, 120.0, 2.5, 0F, 0F)
                    target.setNoGravity(true)
                    initialPp = actor.pokemon.moveSet[0]!!.currentPp
                    initialHealth = target.pokemon.currentHealth
                    val velocity = actor.deltaMovement
                    val nativeVelocity = flightContext.state.rideVelocity.get()
                    val yaw = actor.yRot
                    val pitch = actor.xRot
                    combat.runtime().start(RANGED, combat.bind(actor), combat.bind(target), owner.uuid)
                    combat.stopMovement(combat.bind(actor))
                    combat.face(combat.bind(actor), Point(12.0, 110.0, -5.0), 180.0, 180.0)
                    check(!combat.controls(actor) && actor.deltaMovement == velocity)
                    check(riding.context?.style == RidingStyle.AIR && riding.context?.state?.rideVelocity?.get() == nativeVelocity)
                    check(actor.yRot == yaw && actor.xRot == pitch && owner.vehicle === actor)
                    println("P5CHECK airborne riding keeps native velocity, pitch, yaw and driver during action preparation")
                }
                130 -> {
                    check(combat.mobEffectCategory("minecraft:speed") == "beneficial")
                    check(combat.mobEffectCategory("minecraft:poison") == "harmful")
                    check(combat.mobEffectCategory("minecraft:glowing") == "neutral")
                    check(combat.mobEffectCategory("checks:unregistered") == "")
                    check(hits == 2 && actor.pokemon.moveSet[0]!!.currentPp == initialPp - 1)
                    check(target.pokemon.currentHealth < initialHealth && owner.vehicle === actor && !combat.controls(actor))
                    check(PokemonView.capture(actor).ridingStyle() == "air" && actor.y > 105.0) { "Air rider lost its flight controller" }
                    val pp = actor.pokemon.moveSet[1]!!.currentPp
                    check(runCatching { combat.runtime().start(MOTION, combat.bind(actor), combat.bind(target), owner.uuid) }
                        .exceptionOrNull().let { it is ActionRejectedException && it.reason() == "mounted-control" })
                    check(actor.pokemon.moveSet[1]!!.currentPp == pp)
                    val hand = net.minecraft.world.InteractionHand.MAIN_HAND
                    val bottle = net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.HONEY_BOTTLE)
                    owner.setItemInHand(hand, bottle)
                    val use = net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent.Start(owner, bottle, hand, 32)
                    net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(use)
                    check(use.isCanceled && owner.getItemInHand(hand) === bottle && bottle.count == 1)
                    val release = net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent.Stop(owner, bottle, 8)
                    net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(release)
                    check(release.isCanceled)
                    val apple = net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.APPLE)
                    owner.setItemInHand(hand, apple)
                    val permitted = net.neoforged.neoforge.event.entity.living.LivingEntityUseItemEvent.Start(owner, apple, hand, 32)
                    net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(permitted)
                    check(!permitted.isCanceled && apple.count == 1)
                    println("P5CHECK native item-use start/release rejection preserves the exact stack; allowed use resumes")
                    owner.stopRiding()
                    actor.pokemon.recall()
                    ownerLease?.close(); done = true
                    println("P5CHECK PASS native ground/air riding, ranged world actions and control handover")
                }
            }
        } catch (error: Throwable) {
            done = true
            if (::owner.isInitialized) owner.stopRiding()
            if (::outsider.isInitialized) outsider.stopRiding()
            ownerLease?.close()
            println("P5CHECK FAIL native riding ${error.message}"); error.printStackTrace()
        }
    }
}
