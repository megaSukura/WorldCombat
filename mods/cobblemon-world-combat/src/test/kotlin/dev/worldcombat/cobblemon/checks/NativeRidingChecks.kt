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
import dev.worldcombat.core.world.NativeMountedMotion
import dev.worldcombat.core.world.NativeGroundLift
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
    private var moves = 0
    private var mountedNavigations = 0
    private const val RANGED = "checks:riding_ranged"
    private const val MOTION = "checks:riding_motion"
    private const val NAVIGATION = "checks:riding_navigation"

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
                if (facts.passenger()) current.reject("mounted-control")
            }
            ready(action)
            action.movementLease()
            val move = api.pokemon(action.actor()).move(1)!!
            action.cost(api.ppCost(action, 1, move.key(), 1.0))
            action.after(8) { active ->
                ready(active)
                active.commit(1)
                val before = actor.position()
                active.moveSweep(Point(1.0, 0.0, 0.0), 0.1)
                check(actor.position().distanceTo(before) > 0.5) { "Mounted body sweep did not advance" }
                check(owner.vehicle === actor && NativeMountedMotion.active(actor))
                if (moves == 0) {
                    val reached = actor.position()
                    val wallX = kotlin.math.ceil(actor.boundingBox.maxX).toInt() + 1
                    val floorY = kotlin.math.floor(actor.y).toInt()
                    val saved = mutableMapOf<net.minecraft.core.BlockPos,net.minecraft.world.level.block.state.BlockState>()
                    for (y in floorY..kotlin.math.ceil(actor.boundingBox.maxY + 1).toInt())
                        for (z in kotlin.math.floor(actor.boundingBox.minZ - 1).toInt()..kotlin.math.ceil(actor.boundingBox.maxZ + 1).toInt()) {
                            val pos=net.minecraft.core.BlockPos(wallX,y,z)
                            saved[pos]=actor.level().getBlockState(pos)
                            actor.level().setBlockAndUpdate(pos,net.minecraft.world.level.block.Blocks.STONE.defaultBlockState())
                        }
                    try {
                        val impact=active.moveSweep(Point(4.0,0.0,0.0),0.1)
                        check(impact.blocked() && actor.x - reached.x < 4.0) { "Mounted sweep crossed a native wall" }
                    } finally {
                        saved.forEach { (pos,state) -> actor.level().setBlockAndUpdate(pos,state) }
                        actor.setPos(reached)
                    }
                }
                val jumpY=actor.y
                check(active.world().motion(active.actor(),Point(0.0,0.3,0.0),false))
                moves++
                active.after(2) {
                    check(actor.y > jumpY) { "Native mounted travel did not execute the scripted impulse" }
                    it.finish()
                }
            }
        }
        api.registerAction(NAVIGATION,"1",80,"enemy",32.0) { action ->
            action.movementLease()
            action.commit(1)
            val before=actor.position()
            val origin=action.origin()
            val goal=Point(origin.x()+3.0,origin.y(),origin.z())
            val beforeDistance=action.origin().minus(goal).length()
            val result=action.world().navigate(goal,0.4,1.0)
            check(result=="moving") { "Mounted navigation failed: $result" }
            action.after(12) {
                // Native species speed and turning remain in force; require real progress toward the route, not a sprint budget.
                val progress=beforeDistance-it.origin().minus(goal).length()
                check(progress>0.04) { "Mounted navigation did not approach its route: progress=$progress before=$before after=${actor.position()}" }
                check(owner.vehicle===actor && NativeMountedMotion.active(actor))
                println("P5CHECK mounted native navigation approaches its route with species movement speed: progress=$progress")
                mountedNavigations++
                it.finish()
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
                    NativeRidingSpeedChecks.run(actor)
                    check(combat.groundLift(-701L,combat.bind(actor),1.0,1.0,4.0))
                    check(NativeGroundLift.supported(actor) && !NativeMountedMotion.active(actor))
                    val lifted = NativeGroundLift.riderVelocity(actor,Vec3(0.2,0.0,0.1))
                    check(lifted.x == 0.2 && lifted.z == 0.1 && lifted.y > 0.0)
                    combat.release(-701L,"test-ended")
                    check(!NativeGroundLift.supported(actor))
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
                    initialPp = actor.pokemon.moveSet[1]!!.currentPp
                    combat.runtime().start(MOTION,combat.bind(actor),combat.bind(target),owner.uuid)
                    check(NativeMountedMotion.active(actor) && combat.controls(actor) && owner.vehicle === actor)
                    check(combat.mountedMotion().blocksDriver(owner))
                    combat.mountedMotion().acknowledge(owner,actor.id,handoffToken(combat))
                    check(combat.mountedMotion().blocksDriver(owner)) { "An acknowledgement retired a live motion owner" }
                    println("P5CHECK mounted action preparation owns body motion; pre-handoff driver packets are refused")
                }
                44 -> {
                    combat.runtime().cancelActor(combat.bind(actor),"test-cancelled")
                    check(!NativeMountedMotion.active(actor) && actor.pokemon.moveSet[1]!!.currentPp == initialPp)
                    check(owner.vehicle === actor)
                    val token=handoffToken(combat)
                    combat.mountedMotion().acknowledge(outsider,actor.id,token)
                    combat.mountedMotion().acknowledge(owner,actor.id,token-1)
                    combat.mountedMotion().acknowledge(owner,actor.id+1,token)
                    check(combat.mountedMotion().blocksDriver(owner)) { "Foreign/stale acknowledgement removed the release fence" }
                    combat.mountedMotion().acknowledge(owner,actor.id,token)
                    check(!combat.mountedMotion().blocksDriver(owner)) { "Matching release acknowledgement did not restore driving" }
                    owner.stopRiding()
                    check(!PokemonView.capture(actor).vehicle() && PokemonView.capture(actor).driver().isEmpty())
                    combat.runtime().start(MOTION, combat.bind(actor), combat.bind(target), owner.uuid)
                    check(actor.tryRidingPokemon(owner))
                    println("P5CHECK cancelling preparation restores driving without PP; mounting during preparation remains valid")
                }
                60 -> {
                    check(moves == 1 && !NativeMountedMotion.active(actor))
                    check(actor.pokemon.moveSet[1]!!.currentPp == initialPp - 1)
                    owner.stopRiding()
                    // This no-op connection has no client driving simulation to finish the airborne descent.
                    actor.setPos(actor.x,100.0,actor.z)
                    actor.deltaMovement=Vec3.ZERO
                    actor.setOnGround(true)
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
                    println("P5CHECK late-mounted body movement reaches its endpoint, spends once; foreign driver rejects and dismount returns navigation")
                }
                90 -> {
                    check(actor.position().distanceTo(walkStart) > 0.1) { "Native movement failed to resume after dismount" }
                    combat.controlled(combat.bind(actor), false)
                    check(!combat.controls(actor))
                    check(actor.tryRidingPokemon(owner))
                    combat.runtime().start(NAVIGATION,combat.bind(actor),combat.bind(target),owner.uuid)
                }
                110 -> {
                    check(mountedNavigations==1 && !NativeMountedMotion.active(actor))
                    owner.stopRiding()
                    val pokemon = actor.pokemon
                    pokemon.recall()
                    check(PokemonView.capture(pokemon).activeState() == "inactive")
                    val flying = PokemonProperties.parse("charizard level=40").create()
                    flying.moveSet.setMove(0, Moves.getByName("seedbomb")!!.create())
                    flying.moveSet.setMove(1, Moves.getByName("tackle")!!.create())
                    check(Cobblemon.storage.getParty(owner).add(flying))
                    actor = flying.sendOut(owner.serverLevel(), Vec3(3.0, 125.0, 2.5), null)!!
                }
                130 -> {
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
                150 -> {
                    check(combat.mobEffectCategory("minecraft:speed") == "beneficial")
                    check(combat.mobEffectCategory("minecraft:poison") == "harmful")
                    check(combat.mobEffectCategory("minecraft:glowing") == "neutral")
                    check(combat.mobEffectCategory("checks:unregistered") == "")
                    check(hits == 2 && actor.pokemon.moveSet[0]!!.currentPp == initialPp - 1)
                    check(target.pokemon.currentHealth < initialHealth && owner.vehicle === actor && !combat.controls(actor))
                    check(PokemonView.capture(actor).ridingStyle() == "air" && actor.y > 105.0) { "Air rider lost its flight controller" }
                    initialPp = actor.pokemon.moveSet[1]!!.currentPp
                    combat.runtime().start(MOTION,combat.bind(actor),combat.bind(target),owner.uuid)
                    check(NativeMountedMotion.active(actor) && owner.vehicle === actor)
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
                }
                168 -> {
                    check(moves == 2 && actor.pokemon.moveSet[1]!!.currentPp == initialPp - 1)
                    check(!NativeMountedMotion.active(actor) && owner.vehicle === actor)
                    owner.stopRiding()
                    actor.pokemon.recall()
                    ownerLease?.close(); done = true
                    println("P5CHECK PASS native ground/air riding speed, ranged and body-motion actions, lift and scoped control handover")
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

    private fun handoffToken(combat: dev.worldcombat.core.world.MinecraftCombat): Long {
        val field=NativeMountedMotion::class.java.getDeclaredField("serial")
        field.isAccessible=true
        return field.getLong(combat.mountedMotion())
    }
}
