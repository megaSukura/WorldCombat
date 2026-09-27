package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.storage.party.NPCPartyStore
import com.cobblemon.mod.common.api.storage.party.PartyStore
import com.cobblemon.mod.common.api.storage.party.PlayerPartyStore
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
import net.minecraft.world.entity.LivingEntity
import net.minecraft.world.phys.Vec3
import net.neoforged.neoforge.server.ServerLifecycleHooks
import kotlin.math.ceil

/**
 * Native party reads and writes for content moves. Every write validates the acting owner, the chosen slot and the
 * individual's live state, then uses Cobblemon's own recall/sendOut so the party UI, control lifecycle and storage
 * stay authoritative. The chosen slot object is captured before any recall, and a send-out point must be a loaded,
 * in-world, unblocked spot inside the action's scope. Revive and send-out are deliberately separate: content decides
 * when a restored member steps out. Owner parties support online players and native NPC stores.
 */
object NativeParty {
    /** Ordered read-only party of the actor's owner, or `[]` for a wild actor, an absent entity or a stale owner. */
    fun party(world: WorldAccess, actor: ActorHandle): String {
        world.check()
        val server = ServerLifecycleHooks.getCurrentServer() ?: return "[]"
        val entity = CombatServices.get(server).resolve(actor) as? PokemonEntity ?: return "[]"
        return ownerParty(entity.pokemon, entity.level() as ServerLevel)?.let(::list) ?: "[]"
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
        val party = context.party ?: return failure("no-owner")
        val captured = capture(party, slot)
        val target = captured.first ?: return failure(captured.second)
        if (!placeable(world, context, target, point, false)) return failure("blocked")
        val at = point?.let { Vec3(it.x(), it.y(), it.z()) } ?: context.entity.position()
        val entity = target.sendOut(context.level, at, null) ?: return failure("send-refused")
        handoff(party.owner, slot)
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
        val party = context.party ?: return failure("no-owner")
        val captured = capture(party, slot)
        val target = captured.first ?: return failure(captured.second)
        if (!placeable(world, context, target, point, true)) return failure("blocked")
        val origin = context.entity.position()
        val at = point?.let { Vec3(it.x(), it.y(), it.z()) } ?: origin
        pokemon.recall()
        if (pokemon.state !is InactivePokemonState) return failure("recall-refused")
        if (!party.member(pokemon) || party.store.get(slot) !== target || !party.member(target) || target.isFainted() || target.state !is InactivePokemonState) {
            return result(false, "target-changed", "", restore(context, origin))
        }
        val entity = target.sendOut(context.level, at, null)
        if (entity == null) return result(false, "send-refused", "", restore(context, origin))
        handoff(party.owner, slot)
        return success(context.combat.bind(entity))
    }

    /** Restores a fainted party member to `ratio` of its maximum HP; this is a step on its own, before any send-out. */
    fun revive(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double): Boolean {
        val target = reviveTarget(world, actor, slot, ratio).first ?: return false
        applyRevive(target, ratio)
        return !target.isFainted()
    }

    /** Same revive step with a readable reason; both revives return their result explicitly. */
    fun reviveResult(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double): String =
        reviveResult(world, actor, slot, ratio, null)

    /** Compare the stable individual identity before changing a slot selected during preparation. */
    fun reviveResult(world: WorldAccess, actor: ActorHandle, slot: Int, ratio: Double, expectedId: String?): String {
        val captured = reviveTarget(world, actor, slot, ratio)
        val target = captured.first ?: return failure(captured.second)
        if (expectedId != null && target.uuid.toString() != expectedId) return failure("member-changed")
        applyRevive(target, ratio)
        return if (!target.isFainted()) result(true, "", "", true) else failure("still-fainted")
    }

    private class Context(val combat: MinecraftCombat, val entity: PokemonEntity, val party: OwnerParty?) {
        val level: ServerLevel get() = entity.level() as ServerLevel
        val pokemon: Pokemon get() = entity.pokemon
    }
    private fun context(world: WorldAccess, actor: ActorHandle): Context {
        world.requireMutation(actor)
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        val combat = CombatServices.get(server)
        val entity = combat.resolve(actor) as? PokemonEntity ?: throw ActionRejectedException("actor-left")
        val party = ownerParty(entity.pokemon, entity.level() as ServerLevel)
        if (entity.pokemon.storeCoordinates.get() != null && party == null) throw ActionRejectedException("not-owned")
        return Context(combat, entity, party)
    }
    private class OwnerParty(val store: PartyStore, val owner: LivingEntity, val level: ServerLevel) {
        fun member(pokemon: Pokemon): Boolean {
            if (!owner.isAlive || owner.isRemoved || owner.level() !== level) return false
            val coordinates = pokemon.storeCoordinates.get() ?: return false
            if (coordinates.store !== store || coordinates.get() !== pokemon || pokemon.getOwnerEntity() !== owner || pokemon.getOwnerUUID() != owner.uuid) return false
            return when (store) {
                is PlayerPartyStore -> owner is ServerPlayer && level.server.playerList.getPlayer(owner.uuid) === owner && Cobblemon.storage.getParty(owner) === store
                is NPCPartyStore -> store.npc === owner && level.getEntity(owner.uuid) === owner && (store.npc.party == null || store.npc.party === store)
                else -> false
            }
        }
    }
    /** Dynamic NPC parties live in their members' native coordinates, even when NPCEntity.party is empty. */
    private fun ownerParty(pokemon: Pokemon, level: ServerLevel): OwnerParty? {
        val store = pokemon.storeCoordinates.get()?.store as? PartyStore ?: return null
        val owner = pokemon.getOwnerEntity() ?: return null
        return OwnerParty(store, owner, level).takeIf { it.member(pokemon) }
    }
    /** Captures the chosen party individual or the reason it cannot step out. */
    private fun capture(party: OwnerParty, slot: Int): Pair<Pokemon?, String> {
        if (slot !in 0..5) return null to "invalid-slot"
        val target = party.store.get(slot) ?: return null to "empty-slot"
        if (!party.member(target)) return null to "not-owned"
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
    private fun restore(context: Context, origin: Vec3): Boolean {
        val pokemon = context.pokemon
        if (context.party?.member(pokemon) != true || pokemon.isFainted()) return false
        if (pokemon.state is SentOutState) return true
        return pokemon.state is InactivePokemonState && pokemon.sendOut(context.level, origin, null) != null
    }
    /** Moves the owner's companion selection to the new slot and clears the old pending/approach state. */
    private fun handoff(owner: LivingEntity, slot: Int) {
        if (owner !is ServerPlayer) return
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
        val party = context.party ?: return null to "no-owner"
        val target = party.store.get(slot) ?: return null to "empty-slot"
        if (!party.member(target)) return null to "not-owned"
        if (!target.isFainted()) return null to "not-fainted"
        return target to ""
    }
    private fun applyRevive(target: Pokemon, ratio: Double) {
        val health = ceil(target.maxHealth * ratio).toInt().coerceIn(1, target.maxHealth)
        target.currentHealth = health
        target.faintedTimer = -1
    }
    private fun list(party: OwnerParty): String {
        val array = JsonArray()
        val store = party.store
        for (slot in 0 until store.size()) {
            val member = store.get(slot) ?: continue
            if (!party.member(member)) continue
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
