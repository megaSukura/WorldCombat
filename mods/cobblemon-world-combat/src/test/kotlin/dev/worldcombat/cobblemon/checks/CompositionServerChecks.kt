package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import dev.worldcombat.cobblemon.control.CompanionContent
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.cobblemon.control.WorldSkill
import dev.worldcombat.cobblemon.control.TacticsContext
import dev.worldcombat.cobblemon.network.ControlCommand
import com.mojang.authlib.GameProfile
import net.neoforged.neoforge.common.util.FakePlayerFactory
import net.minecraft.server.level.ServerPlayer
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.runtime.effect.EffectContext
import dev.worldcombat.core.world.*
import net.minecraft.server.MinecraftServer
import net.minecraft.tags.DamageTypeTags
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.animal.Cow
import net.minecraft.world.entity.ai.memory.MemoryModuleType
import net.minecraft.world.entity.ai.memory.WalkTarget
import net.minecraft.core.BlockPos
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.common.NeoForge
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent
import java.util.UUID

/** Actual Rhino, shared native loadout/configuration, PP and tracked native projectile composition. */
object CompositionServerChecks {
    private var age = 0
    private var done = false
    private lateinit var pokemon: PokemonEntity
    private lateinit var actor: Cow
    private lateinit var first: Cow
    private lateinit var second: Cow
    private lateinit var bodyTarget: Cow
    private var parent: ActionContext? = null
    private var child: ActionContext? = null
    private var manual: ActionContext? = null
    private lateinit var player: ServerPlayer
    private var ownerLease: AutoCloseable? = null
    private var emitter = 0L
    private var hits = 0
    private var completions = 0
    private var bodyHits = 0
    private var bodyCompletions = 0
    private var nativeHits = 0
    private var body: ActorHandle? = null
    private var stale: WorldAccess? = null
    private var slow = ""
    private var slowEntity: CombatProjectile? = null
    private var epoch = 0L
    private var reloaded = false
    private var pp = intArrayOf()
    private lateinit var steering: Cow
    private var steeringStart = 0.0
    private var aim = 0L
    private var submittedParent: ActionContext? = null
    private var submittedChild: ActionContext? = null
    private var submittedCount = 0
    private var followedCount = 0
    private var submissionView: TacticsContext? = null
    // Native identities serve only as real PP containers for the neutral A/B timelines.
    @JvmStatic fun nativeId(index: Int): String = listOf("pound", "leer", "scratch", "tailwhip")[index]
    @JvmStatic fun submissionParent(action: ActionContext) { submittedParent = action }
    @JvmStatic fun submissionChild(action: ActionContext) { submittedChild = action }
    @JvmStatic fun submissionScope(): TacticsContext = submissionView ?: error("Submission scope expired")
    @JvmStatic fun submitted(instance: Long) {
        check(instance == submittedParent!!.id() && instance != submittedChild!!.id()) { "Adapter lost the exact accepted instance" }
        submittedCount++
    }
    @JvmStatic fun submissionFollowed(instance: Long, world: WorldAccess) {
        check(instance == submittedParent!!.id() && world.action(instance).reason() == "finished")
        check(world.actions().any { it.instance() == submittedChild!!.id() }) { "Independent child did not remain active during parent follow-up" }
        followedCount++
    }
    private fun submission(combat: MinecraftCombat, kind: String, phase: String) {
        if (kind == "tactics" && phase == "start") submissionView = TacticsContext(combat, CompanionControl.session(player), "tick")
        try {
            val result = combat.runtime().event("checks:submit_task", combat.bind(pokemon), null, "{\"kind\":\"$kind\",\"phase\":\"$phase\"}", true)
            check(result.rejection().isEmpty()) { "Submission fixture rejected: ${result.rejection()}" }
        } finally { submissionView?.close(); submissionView = null }
    }
    @JvmStatic fun parentStarted(action: ActionContext) { parent = action }
    @JvmStatic fun childStarted(action: ActionContext, invocation: String, value: Int) {
        if (action.parent() == 0L) manual = action else child = action
        val state = JsonParser.parseString(invocation).asJsonObject
        check(parent != null && action.id() != parent!!.id() && (action.parent() == 0L || action.parent() == parent!!.id())) { "Inline identity reused" }
        check(state["slot"].asInt == 1 && state["executing"].asString == nativeId(1) && value == 7) { "Callee configuration/slot lost" }
        check(action.target() == null && action.targetKind() == "point" && action.targetPosition().x() == 10.0 && action.range() == 16.0) { "Callee inherited parent's self input/range" }
        check(state["key"].asString == dev.worldcombat.cobblemon.script.PokemonScriptApi().pokemon(action.actor()).move(1)!!.key()) { "Child payment key differs from selected slot" }
    }
    @JvmStatic fun childCommitted(action: ActionContext) { check(action.parent() == 0L || action.parent() == parent!!.id()) }
    @JvmStatic fun forked(result: ActionRuntime.StartResult) { check(result.accepted()) { "Native fork rejected: ${result.reason()}" } }
    @JvmStatic fun effectStarted(effect: EffectContext) { emitter = effect.id(); stale = effect.world() }
    @JvmStatic fun effectHit(effect: EffectContext) { hits++; check(effect.impact().source().entity() == actor.uuid); stale = effect.world() }
    @JvmStatic fun effectComplete(effect: EffectContext) { completions++; check(effect.world().busy()); stale = effect.world() }
    @JvmStatic fun bodySpawned(actor: ActorHandle) { body = actor }
    @JvmStatic fun bodyHit(effect: EffectContext) { bodyHits++; check(effect.impact().source() == body && effect.world().source() == body) }
    @JvmStatic fun bodyComplete(effect: EffectContext) { bodyCompletions++; check(effect.source() == body) }
    @JvmStatic fun slowFlight(id: String) { slow = id }
    private fun world(combat: MinecraftCombat, actor: ActorHandle) = WorldAccess(combat.runtime(), actor, null, {}, true, 0)
    private fun request(server: MinecraftServer, slot: Int) {
        val combat = CombatServices.get(server); val handle = combat.bind(pokemon); val session = CompanionControl.session(player)
        CompanionControl.advance(session)
        val binding = CompanionContent.resolve(handle, slot)
        check(binding.available()) { "Native binding unavailable: $binding" }
        CompanionControl.request(player, ControlCommand(session.id, session.gate.lastSequence() + 1, CombatServices.CONTENT.epoch(), server.tickCount.toLong(),
            handle.entity(), handle.generation(), 0, "cast", slot, if (slot == 0) handle.entity() else ControlCommand.NONE,
            Point(10.0, 100.0, 2.0), Point(1.0, 0.0, 0.0), binding.version))
        check(session.reason == "accepted") { "Compatible manual request was queued/refused: ${session.reason}" }
    }
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        val combat = CombatServices.get(server); val runtime = combat.runtime(); val level = server.overworld()
        try {
            when (age++) {
                0 -> {
                    TestWorld.prepare(server)
                    player = FakePlayerFactory.get(level, GameProfile(UUID.randomUUID(), "CompositionCheck"))
                    player.moveTo(2.0, 100.0, 4.0, 0F, 0F)
                    ownerLease = TestWorld.mockOwner(server, player); PokemonServerChecks.initializeTestData(player.uuid)
                    val value = PokemonProperties.parse("bulbasaur level=20").create()
                    value.moveSet.clear()
                    for (i in 0..3) value.moveSet.setMove(i, Moves.getByName(nativeId(i))!!.create())
                    Cobblemon.storage.getParty(player).add(value)
                    pokemon = value.sendOut(level, Vec3(2.0, 100.0, 2.0), null) { it.setNoAi(true); it.setNoGravity(true) } ?: error("Native actor spawn failed")
                    steering = TestWorld.mob(EntityType.COW, level, 2.0)
                    steering.moveTo(2.0, 100.0, 4.0); steering.setNoAi(false); steering.setNoGravity(false)
                    combat.controlled(combat.bind(steering), true)
                    NeoForge.EVENT_BUS.addListener { event: LivingIncomingDamageEvent ->
                        if (event.source.directEntity is CombatProjectile) {
                            nativeHits++
                            check(event.source.`is`(DamageTypeTags.IS_PROJECTILE)) { "Projectile tag missing" }
                            check(event.source.entity === actor || body != null && event.source.entity?.uuid == body!!.entity()) { "Native causing entity lost" }
                            check(event.source.sourcePosition == (event.source.directEntity as CombatProjectile).damageOrigin()) { "Native impact origin lost" }
                        }
                    }
                }
                2 -> {
                    steeringStart = steering.x
                    check(world(combat, combat.bind(steering)).navigate(Point(13.0, 100.0, 4.0), .5, 1.0) == "moving")
                    check(!steering.navigation.isDone) { "Native path fixture was not installed" }
                }
                7 -> {
                    check(steering.x > steeringStart + .02 && !steering.navigation.isDone) { "Native path never drove the actor" }
                    val handle = combat.bind(steering)
                    aim = runtime.start("checks:aiming", handle, handle, null)
                    check(steering.navigation.isDone) { "Aim-only acquisition retained a pre-existing native path" }
                    combat.controlled(handle, false)
                    check(combat.controls(steering)) { "Releasing ambient control dropped the aim owner's lease" }
                    runtime.start("checks:background", handle, handle, null)
                }
                11 -> {
                    check(steering.navigation.isDone && combat.controls(steering) && kotlin.math.abs(net.minecraft.util.Mth.wrapDegrees(steering.yRot)) < 1F) {
                        "Aim handoff: pathDone=${steering.navigation.isDone} controlled=${combat.controls(steering)} yaw=${steering.yRot}"
                    }
                    check(world(combat, combat.bind(steering)).navigate(Point(13.0, 100.0, 4.0), .5, 1.0) == "busy")
                    runtime.interrupt(combat.bind(steering), aim, "checks:complete")
                    check(!combat.controls(steering)) { "Aim-only handoff retained native control after release" }
                    check(world(combat, combat.bind(steering)).navigate(Point(13.0, 100.0, 4.0), .5, 1.0) == "moving")
                    steering.discard()
                }
                20 -> {
                    pp = intArrayOf(pokemon.pokemon.moveSet[0]!!.currentPp, pokemon.pokemon.moveSet[1]!!.currentPp)
                    request(server, 0)
                }
                22 -> check(WorldSkill(world(combat, combat.bind(pokemon)), 1).ready()) { "Native readiness still globally busy" }
                28 -> {
                    val handle = combat.bind(pokemon)
                    check(runtime.state(handle, parent!!.id()) != null && runtime.state(handle, child!!.id()) == null) { "Independent child did not complete while parent continues" }
                    check(pokemon.pokemon.moveSet[0]!!.currentPp == pp[0] - 1 && pokemon.pokemon.moveSet[1]!!.currentPp == pp[1] - 2) { "Independent PP identities or quantities lost" }
                    check(runtime.cooldown(handle, parent!!.content()) > 0 && runtime.cooldown(handle, child!!.content()) > 0)
                }
                32 -> request(server, 1)
                36 -> {
                    val handle = combat.bind(pokemon)
                    check(manual != null && runtime.state(handle, parent!!.id()) != null && runtime.result(handle, manual!!.id()).reason() == "finished")
                    check(pokemon.pokemon.moveSet[0]!!.currentPp == pp[0] - 1 && pokemon.pokemon.moveSet[1]!!.currentPp == pp[1] - 4)
                    check(combat.controls(pokemon)) { "Background completion released foreground movement" }
                    check(CompanionControl.snapshot(CompanionControl.session(player)).stage() == "executing") { "Background completion clobbered foreground UI" }
                }
                37 -> submission(combat, "tactics", "start")
                38 -> submission(combat, "tactics", "follow")
                39 -> submission(combat, "skill", "start")
                40 -> submission(combat, "skill", "follow")
                41 -> submission(combat, "ability", "start")
                42 -> {
                    submission(combat, "ability", "follow")
                    pokemon.setNoGravity(false); pokemon.setOnGround(true)
                    val handle = combat.bind(pokemon)
                    combat.controlled(handle, true)
                    pokemon.brain.setMemory(MemoryModuleType.WALK_TARGET, WalkTarget(BlockPos(13, 100, 2), 1F, 1))
                    pokemon.brain.setMemory(MemoryModuleType.ATTACK_TARGET, player)
                    check(pokemon.navigation.moveTo(13.0, 100.0, 2.0, 1.0) && !pokemon.navigation.isDone) {
                        "Native path setup: position=${pokemon.position()} grounded=${pokemon.onGround()} navigation=${pokemon.navigation.javaClass.simpleName}"
                    }
                    aim = runtime.start("checks:aiming", handle, handle, null)
                    check(pokemon.navigation.isDone && pokemon.brain.getMemory(MemoryModuleType.WALK_TARGET).isEmpty
                        && pokemon.brain.getMemory(MemoryModuleType.ATTACK_TARGET).isEmpty) { "Aim handoff from an ambient lease retained native brain steering" }
                    combat.controlled(handle, false)
                    check(combat.controls(pokemon)) { "Ambient release dropped the native aim lease" }
                    runtime.interrupt(handle, aim, "checks:complete")
                    check(!combat.controls(pokemon)) { "Aim lease was retained by unrelated independent children" }
                }
                44 -> {
                    check(runtime.state(combat.bind(pokemon), parent!!.id()) == null && submittedCount == 3 && followedCount == 3) { "Adapter submission/follow-up coverage incomplete" }
                    pokemon.discard()
                    actor = TestWorld.mob(EntityType.COW, level, 2.0)
                    first = TestWorld.mob(EntityType.COW, level, 7.0); second = TestWorld.mob(EntityType.COW, level, 10.0)
                    runtime.start("checks:casting", combat.bind(actor), combat.bind(actor), null)
                    runtime.start("checks:ongoing", combat.bind(actor), combat.bind(actor), null)
                }
                66 -> {
                    check(hits == 4 && completions == 2 && nativeHits == 4) { "Piercing/multiple flight callbacks: $hits/$completions/$nativeHits" }
                    check(first.health == 8F && second.health == 8F && runtime.projectiles().size() == 0) { "Effect-owned native damage/retirement failed" }
                    check(combat.controls(actor)) { "Effect-owned completion released an unrelated action's control" }
                    try { stale!!.tick(); error("Retained callback scope stayed writable") } catch (_: ActionInactiveException) { }
                    bodyTarget = TestWorld.mob(EntityType.COW, level, 8.0); bodyTarget.moveTo(8.0, 100.0, 4.0)
                    runtime.event("checks:spawn", combat.bind(actor), null, "{}", true)
                    actor.discard() // Body and its brain own their own remaining work.
                }
                84 -> {
                    check(bodyHits == 1 && bodyCompletions == 1 && bodyTarget.health == 9F && nativeHits == 5) { "Body-brain native projectile failed" }
                    actor = TestWorld.mob(EntityType.COW, level, 2.0)
                    emitter = world(combat, combat.bind(actor)).effect("checks:emitter", combat.bind(actor), "{}", 80)
                    runtime.effects().operate(emitter, "checks:slow", combat.bind(actor), null, "{}")
                    slowEntity = level.getEntity(UUID.fromString(slow)) as CombatProjectile
                    epoch = CombatServices.CONTENT.epoch()
                    server.reloadResources(server.packRepository.selectedIds).thenRun { reloaded = true }
                        .exceptionally { failure -> done = true; println("P5CHECK FAIL composition reload: $failure"); null }
                }
            }
            if (age > 85 && reloaded && CombatServices.CONTENT.epoch() > epoch) {
                check(slowEntity!!.isRemoved && runtime.projectiles().size() == 0 && completions == 2) { "Reload retained native flights/callbacks" }
                check(CombatServices.CONTENT.get("checks:casting") != null) { "Reloaded fixture unavailable" }
                body?.let { world(combat, it).dismiss(it) }
                done = true
                ownerLease?.close(); ownerLease = null
                println("P5CHECK PASS composition: exact adapter submission identities, native path/brain aim handoff, independent native PP/config/input, compatible readiness, effect/body projectiles and reload cleanup")
            }
            check(age < 180) { "Composition check exceeded its tick deadline" }
        } catch (failure: Throwable) {
            done = true; ownerLease?.close(); ownerLease = null; failure.printStackTrace(); println("P5CHECK FAIL composition at $age: $failure")
        }
    }
}
