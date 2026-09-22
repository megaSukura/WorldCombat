package dev.worldcombat.cobblemon.control

import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.runtime.effect.EffectData
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import dev.worldcombat.cobblemon.network.ControlCommand

/** Callback-scoped facts and writes. Selection, authorization and movement policy belong to content. */
class TacticsContext(
    private val combat: MinecraftCombat,
    private val session: CompanionControl.Session,
    private val operationValue: String,
    private val command: ControlCommand? = null,
    private val noticeValue: String = "{}"
) {
    private val body = session.body
    private val actorValue = body.actor ?: error("Actor left")
    private val epoch = CombatServices.CONTENT.epoch()
    private var open = true
    private var used = false
    private val access = WorldAccess(combat.runtime(), actorValue, session.player.uuid, ::check, true, 0)
    private fun check() {
        combat.checkThread()
        if (!open || epoch != CombatServices.CONTENT.epoch() || !combat.valid(actorValue)
            || !combat.mayAct(actorValue, session.player.uuid)) throw ActionInactiveException("Decision scope expired")
    }
    fun close() { open = false }
    fun world(): WorldAccess { check(); return access }
    fun actor() = actorValue
    fun owner(): ActorHandle { check(); return combat.bind(session.player) }
    fun operation() = operationValue
    fun notice(): String { check(); return noticeValue }
    fun value() = command?.value() ?: 0
    fun memberIndex() = body.index
    fun commandTarget(): ActorHandle? {
        check()
        val id = command?.target() ?: return null
        val entity = session.player.serverLevel().getEntity(id) as? net.minecraft.world.entity.LivingEntity ?: return null
        val target = combat.bind(entity)
        return target.takeIf { combat.valid(it) && combat.sameWorld(actorValue, it) && combat.position(actorValue).minus(combat.position(it)).length() <= 64 }
    }
    fun commandPoint(): Point { check(); return command?.point() ?: combat.position(actorValue) }
    fun intent() = body.intent
    fun intentTarget() = body.intentTarget?.takeIf(combat::valid)
    fun intentPoint() = body.intentPoint
    fun tactics() = body.tactics
    fun permissions() = body.permissions
    fun chaseRange() = body.chaseRange
    fun captureHold() = body.captureHold?.toString() ?: ""
    fun lastManual() = body.lastManual
    fun pending() = body.pending != null
    fun blockedUntil() = body.blockedUntil
    fun blockedUntil(tick: Long) { check(); require(tick in 0..(combat.runtime().now() + 1200L)); body.blockedUntil = tick }
    fun memory(): String { check(); return body.memory }
    fun memory(json: String) { check(); body.memory = EffectData.copy(json) }
    fun preferences(): String { check(); return body.preferences }
    fun preferences(json: String) { check(); body.preferences = EffectData.copy(json); CompanionTactics.save(session, combat) }
    fun settings(preset: String, permissions: Int, range: Int) {
        check(); require(preset.matches(Regex("[a-z_]{1,32}")) && permissions in 0..15 && range in 1..32)
        body.tactics = preset; body.permissions = permissions; body.chaseRange = range
    }
    fun intent(id: String, target: ActorHandle?, point: Point?) {
        check(); require(id.matches(Regex("[a-z_]{1,32}")))
        if (target != null) require(combat.valid(target) && combat.sameWorld(actorValue, target))
        if (point != null) require(point.length().isFinite() && point.minus(combat.position(actorValue)).length() <= 64)
        if(body.approaching){combat.stopMovement(actorValue);body.approaching=false}
        body.intent = id; body.intentTarget = target; body.intentPoint = point; body.pending = null
        combat.runtime().interruptPreparation(actorValue)
    }
    fun capture(id: String) { check(); if(body.approaching){combat.stopMovement(actorValue);body.approaching=false};body.captureHold = id.takeIf { it.isNotEmpty() }?.let(java.util.UUID::fromString); body.pending = null; combat.runtime().interruptPreparation(actorValue) }
    fun report(stage: String, reason: String) {
        check(); require(stage.matches(Regex("[a-z-]{1,32}")) && reason.length <= 128)
        body.behaviorStage = stage; if (reason.isNotEmpty()) body.reason = reason
    }
    fun reject(reason: String): Nothing { check(); throw ActionRejectedException(reason) }
    fun kind(slot: Int) = binding(slot).definition?.targetKind() ?: ""
    fun action(slot: Int) = binding(slot).id
    fun range(slot: Int) = binding(slot).range
    private fun binding(slot: Int): SkillBinding { check(); require(slot in 0..3); return CompanionContent.resolve(actorValue, slot) }
    fun canUse(slot: Int): Boolean {
        check()
        if (used || slot !in 0..3) return false
        val binding = binding(slot)
        return binding.available() && combat.runtime().readiness(actorValue, binding.id).isEmpty()
    }
    fun castAt(slot: Int, target: ActorHandle): Boolean = submitAt(slot, target) > 0
    fun castPoint(slot: Int, point: Point, direction: Point): Boolean = submitPoint(slot, point, direction) > 0
    fun castInput(slot: Int, target: ActorHandle?, point: Point, direction: Point, input: String): Boolean =
        submitInput(slot, target, point, direction, input) > 0
    fun submitAt(slot: Int, target: ActorHandle): Long {
        check()
        if (!combat.valid(target) || !combat.sameWorld(actorValue, target)) return 0
        val delta = combat.position(target).minus(combat.position(actorValue))
        return submit(slot, ActionTarget.entity(target, combat.position(target), if (delta.length() < 0.01) Point(0.0, 0.0, 1.0) else delta))
    }
    fun submitPoint(slot: Int, point: Point, direction: Point): Long = submit(slot, ActionTarget.point(point, direction))
    fun submitInput(slot: Int, target: ActorHandle?, point: Point, direction: Point, input: String): Long =
        submit(slot, if (target == null) ActionTarget.point(point, direction) else ActionTarget.entity(target, point, direction), input)
    private fun submit(slot: Int, target: ActionTarget, input: String = "{}"): Long {
        if (!canUse(slot)) return 0
        used = true
        return try {
            val binding = binding(slot)
            combat.runtime().start(binding.id, actorValue, target, session.player.uuid,
                if (input == "{}") binding.arguments else binding.arguments + (ActionInput.KEY to input))
        } catch (_: ActionRejectedException) { 0 }
    }
}
