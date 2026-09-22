package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.storage.party.PartyStore
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.activestate.ActivePokemonState
import com.cobblemon.mod.common.pokemon.activestate.InactivePokemonState
import com.cobblemon.mod.common.pokemon.activestate.SentOutState
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import dev.worldcombat.cobblemon.control.CompanionControl
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.level.ServerLevel
import net.minecraft.server.level.ServerPlayer
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.server.ServerLifecycleHooks
import kotlin.math.ceil

/**
 * Native party reads and writes for content moves. Every write validates the acting owner, the chosen slot and the
 * individual's live state, then uses Cobblemon's own recall/sendOut so the party UI, control lifecycle and storage
 * stay authoritative. The chosen slot object is captured before any recall, and a send-out point must be a loaded,
 * in-world, unblocked spot inside the action's scope. Revive and send-out are deliberately separate: content decides
 * when a restored member steps out. Wild individuals have no owner party, so these operations refuse instead of
 * pretending.
 */
object NativeParty {
    /** Ordered read-only party of the actor's owner, or `[]` for a wild actor, an absent entity or a stale owner. */
    fun party(world: WorldAccess, actor: ActorHandle): String {
        world.check()
        val server = ServerLifecycleHooks.getCurrentServer() ?: return "[]"
        val pokemon = (CombatServices.get(server).resolve(actor) as? PokemonEntity)?.pokemon ?: return "[]"
        val owner = pokemon.getOwnerPlayer() ?: return "[]"
        if (!member(owner, pokemon)) return "[]"
        return list(Cobblemon.storage.getParty(owner))
    }

    /** Recalls the sent-out individual behind `actor` through the native path; false keeps it unchanged. */
    fun recall(world: WorldAccess, actor: ActorHandle): Boolean {
        val context = context(world, actor)
        val pokemon = context.pokemon
        if (pokemon.state !is SentOutState) return false
        val entity = pokemon.entity ?: return false
        if (entity.isBusy || entity.isEvolving) return false
        pokemon.recall()
        return pokemon.state !is ActivePokemonState
    }

    /** Sends the owner's party `slot` out at `point` (or the actor's position) through Cobblemon's native send-out. */
    fun sendOut(world: WorldAccess, actor: ActorHandle, slot: Int, point: Point?): String {
        val context = context(world, actor)
        val owner = context.pokemon.getOwnerPlayer() ?: return failure("no-owner")
        val captured = capture(context.pokemon, slot)
        val target = captured.first ?: return failure(captured.second)
        if (!placeable(world, context, target, point, false)) return failure("blocked")
        val at = point?.let { Vec3(it.x(), it.y(), it.z()) } ?: context.entity.position()
        val entity = target.sendOut(context.level, at, null) ?: return failure("send-refused")
        handoff(owner, slot)
        return success(context.combat.bind(entity))
    }

    /**
     * Recalls `actor` and sends the owner's party `slot` out. The slot object is captured before the recall, so an
     * event during recall cannot silently swap the outgoing individual. A refused send-out restores the caster; the
     * receipt says whether that restore succeeded, so a lost caster is never reported as a clean recovery.
     */
    fun switchOut(world: WorldAccess, actor: ActorHandle, slot: Int, point: Point?): String {
        val context = context(world, actor)
        val pokemon = context.pokemon
        if (pokemon.state !is SentOutState) return failure("not-sent-out")
        if (context.entity.isBusy || context.entity.isEvolving) return failure("busy")
        val owner = pokemon.getOwnerPlayer() ?: return failure("no-owner")
        val captured = capture(pokemon, slot)
        val target = captured.first ?: return failure(captured.second)
        if (!placeable(world, context, target, point, true)) return failure("blocked")
        val origin = context.entity.position()
        val at = point?.let { Vec3(it.x(), it.y(), it.z()) } ?: origin
        pokemon.recall()
        if (Cobblemon.storage.getParty(owner).get(slot) !== target || target.getOwnerUUID() != pokemon.getOwnerUUID() || target.isFainted() || target.state !is InactivePokemonState) {
            return result(false, "target-changed", "", restore(context.level, pokemon, origin))
        }
        val entity = target.sendOut(context.level, at, null)
        if (entity == null) return result(false, "send-refused", "", restore(context.level, pokemon, origin))
        handoff(owner, slot)
        return success(context.combat.bind(entity))
    }

    /** Restores a fainted party member to `ratio` of its maximum HP; this is a step on its own, before any send-out. */
    fun revive(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double): Boolean {
        val target = reviveTarget(world, actor, slot, ratio).first ?: return false
        applyRevive(target, ratio)
        return !target.isFainted()
    }

    /** Same revive step with a readable reason; both revives return their result explicitly. */
    fun reviveResult(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double): String {
        val captured = reviveTarget(world, actor, slot, ratio)
        val target = captured.first ?: return failure(captured.second)
        applyRevive(target, ratio)
        return if (!target.isFainted()) result(true, "", "", true) else failure("still-fainted")
    }

    private class Context(val combat: MinecraftCombat, val entity: PokemonEntity) {
        val level: ServerLevel get() = entity.level() as ServerLevel
        val pokemon: Pokemon get() = entity.pokemon
    }
    private fun context(world: WorldAccess, actor: ActorHandle): Context {
        world.requireMutation(actor)
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        val combat = CombatServices.get(server)
        val entity = combat.resolve(actor) as? PokemonEntity ?: throw ActionRejectedException("actor-left")
        val owner = entity.pokemon.getOwnerPlayer()
        if (owner != null && !member(owner, entity.pokemon)) throw ActionRejectedException("not-owned")
        return Context(combat, entity)
    }
    /** The actor must still be an individual in its owner's party, not merely carry a stale owner reference. */
    private fun member(owner: ServerPlayer, pokemon: Pokemon): Boolean {
        val store = Cobblemon.storage.getParty(owner)
        for (slot in 0 until store.size()) {
            val candidate = store.get(slot) ?: continue
            if (candidate === pokemon || candidate.uuid == pokemon.uuid) return true
        }
        return false
    }
    /** Captures the chosen party individual or the reason it cannot step out. */
    private fun capture(owner: Pokemon, slot: Int): Pair<Pokemon?, String> {
        if (slot !in 0..5) return null to "invalid-slot"
        val player = owner.getOwnerPlayer() ?: return null to "no-owner"
        val target = Cobblemon.storage.getParty(player).get(slot) ?: return null to "empty-slot"
        if (target.getOwnerUUID() != owner.getOwnerUUID()) return null to "not-owned"
        if (target.isFainted()) return null to "fainted"
        if (target.state !is InactivePokemonState) return null to "already-out"
        target.entity?.let { if (it.isBusy || it.isEvolving) return null to "busy" }
        return target to ""
    }
    /** A send-out point must be finite, loaded, inside the build height and unblocked inside the action's scope. */
    private fun placeable(world: WorldAccess, context: Context, target: Pokemon, point: Point?, replacing: Boolean): Boolean {
        return try {
            val at = point ?: Point(context.entity.x, context.entity.y, context.entity.z)
            val source = context.combat.resolve(world.source()) ?: return false
            if (!at.x().isFinite() || !at.y().isFinite() || !at.z().isFinite() ||
                source.level() !== context.level || source.distanceToSqr(at.x(), at.y(), at.z()) > 64.0 * 64.0) return false
            val shape = target.form.hitbox
            val width = shape.width().toDouble().coerceAtLeast(0.01)
            val height = shape.height().toDouble().coerceAtLeast(0.01)
            val box = net.minecraft.world.phys.AABB(at.x()-width/2, at.y(), at.z()-width/2, at.x()+width/2, at.y()+height, at.z()+width/2)
            val min = net.minecraft.core.BlockPos.containing(box.minX, box.minY, box.minZ)
            val max = net.minecraft.core.BlockPos.containing(box.maxX-1e-4, box.maxY-1e-4, box.maxZ-1e-4)
            val level = context.level
            level.hasChunksAt(min, max) && !level.isOutsideBuildHeight(min) && !level.isOutsideBuildHeight(max) &&
                level.worldBorder.isWithinBounds(box) && !level.getBlockCollisions(context.entity, box).iterator().hasNext() &&
                level.getEntities(if (replacing) context.entity else null, box) { it.isAlive && it.canBeCollidedWith() }.isEmpty()
        } catch (_: ActionRejectedException) { false } catch (_: IllegalArgumentException) { false }
    }
    /** Puts the recalled caster back where it stood; false means the caster could not be restored. */
    private fun restore(level: ServerLevel, pokemon: Pokemon, origin: Vec3): Boolean {
        if (pokemon.state is SentOutState) return true
        return pokemon.sendOut(level, origin, null) != null
    }
    /** Moves the owner's companion selection to the new slot and clears the old pending/approach state. */
    private fun handoff(owner: ServerPlayer, slot: Int) {
        try {
            val session = CompanionControl.session(owner)
            session.partySlot = slot
            session.pending = null
            session.body.approaching = false
            session.body.behaviorStage = "idle"
        } catch (_: RuntimeException) {}
    }
    private fun reviveTarget(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double): Pair<Pokemon?, String> {
        if (!ratio.isFinite() || ratio <= 0.0 || ratio > 1.0) throw IllegalArgumentException("Revive ratio outside (0,1]")
        val context = context(world, actor)
        if (slot !in 0..5) return null to "invalid-slot"
        val owner = context.pokemon.getOwnerPlayer() ?: return null to "no-owner"
        val target = Cobblemon.storage.getParty(owner).get(slot) ?: return null to "empty-slot"
        if (target.getOwnerUUID() != context.pokemon.getOwnerUUID()) return null to "not-owned"
        if (!target.isFainted()) return null to "not-fainted"
        return target to ""
    }
    private fun applyRevive(target: Pokemon, ratio: Double) {
        val health = ceil(target.maxHealth * ratio).toInt().coerceIn(1, target.maxHealth)
        target.currentHealth = health
        target.faintedTimer = -1
    }
    private fun list(store: PartyStore): String {
        val array = JsonArray()
        for (slot in 0 until store.size()) {
            val member = store.get(slot) ?: continue
            val entry = JsonObject()
            entry.addProperty("slot", slot)
            entry.addProperty("id", member.uuid.toString())
            entry.addProperty("species", member.species.resourceIdentifier.toString())
            entry.addProperty("level", member.level)
            entry.addProperty("health", member.currentHealth)
            entry.addProperty("maxHealth", member.maxHealth)
            entry.addProperty("fainted", member.isFainted())
            entry.addProperty("state", member.state.name)
            entry.addProperty("active", member.state is ActivePokemonState)
            array.add(entry)
        }
        return array.toString()
    }
    private fun success(actor: ActorHandle) = result(true, "", actor.ref(), true)
    private fun failure(reason: String) = result(false, reason, "", true)
    private fun result(ok: Boolean, reason: String, ref: String, restored: Boolean): String {
        val json = JsonObject()
        json.addProperty("ok", ok); json.addProperty("reason", reason); json.addProperty("ref", ref); json.addProperty("restored", restored)
        return json.toString()
    }
}
