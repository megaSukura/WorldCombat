package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.block.entity.PokemonPastureBlockEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.entity.pokemon.PokemonBehaviourFlag
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.BlockPos
import net.minecraft.server.level.ServerLevel
import net.minecraft.world.level.Level
import java.util.UUID
import net.minecraft.server.level.ServerPlayer

/** Loaded native pasture residents. Cobblemon owns the PC, tether and block lifecycle. */
object NativePasture {
    private val residents = java.util.IdentityHashMap<Level, MutableMap<UUID, PokemonEntity>>()

    /** PC caches can be replaced while a pasture stays loaded, including with its owner offline. */
    @JvmStatic fun synchronize(entity: PokemonEntity) {
        if (entity.level().isClientSide || !entity.isAlive || entity.isRemoved) return
        val tether = entity.tethering ?: return
        val current = tether.getPokemon() ?: return
        // A cleared connection is also authoritative: the native delegate will retire
        // this representation. A different live connection belongs to another pasture.
        if (current === entity.pokemon || current.uuid != tether.pokemonId || current.uuid != entity.pokemon.uuid ||
            current.tetheringId != null && current.tetheringId != tether.tetheringId) return
        val representation = current.entity
        if (representation != null && representation !== entity && representation.isAlive && !representation.isRemoved) return
        val previous = entity.pokemon
        entity.pokemon = current
        PokemonViews.invalidate(previous); PokemonViews.invalidate(current)
        NativeContentSubscriptions.entityChanged(entity)
    }

    @JvmStatic fun track(entity: PokemonEntity) {
        if (entity.level().isClientSide) return
        val map = residents[entity.level()]
        if (entity.tethering == null || entity.isRemoved) { remove(entity); return }
        if (map?.get(entity.uuid) === entity) return
        residents.getOrPut(entity.level()) { linkedMapOf() }[entity.uuid] = entity
        PokemonViews.invalidate(entity.pokemon)
        NativeContentSubscriptions.entityChanged(entity)
    }
    fun remove(entity: PokemonEntity) {
        val map = residents[entity.level()] ?: return
        if (map[entity.uuid] !== entity) return
        map.remove(entity.uuid)
        if (map.isEmpty()) residents.remove(entity.level())
        PokemonViews.invalidate(entity.pokemon)
        NativeContentSubscriptions.entityChanged(entity)
    }
    fun reset() = residents.clear()

    fun loaded(server: net.minecraft.server.MinecraftServer): List<PokemonEntity> = residents.entries
        .filter { (it.key as? ServerLevel)?.server === server }
        .flatMap { it.value.values.toList() }.filter { active(it) }

    /** Identity is rechecked against the current native PC and block, including after reload/recall. */
    fun active(entity: PokemonEntity): Boolean {
        val tether = entity.tethering ?: return false
        val level = entity.level() as? ServerLevel ?: return false
        if (!entity.isAlive || entity.isRemoved || !level.isPositionEntityTicking(entity.blockPosition()) ||
            entity.pokemon.tetheringId != tether.tetheringId ||
            !level.hasChunkAt(tether.pasturePos)) return false
        val block = level.getBlockEntity(tether.pasturePos) as? PokemonPastureBlockEntity ?: return false
        return block.tetheredPokemon.any { it.tetheringId == tether.tetheringId && it.pokemonId == entity.pokemon.uuid } &&
            tether.getPokemon() === entity.pokemon
    }
    fun owned(player: ServerPlayer): List<PokemonEntity> = residents[player.level()]?.values
        ?.filter { it.tethering?.playerId == player.uuid && it.pokemon.getOwnerUUID() == player.uuid && active(it) } ?: emptyList()

    /** Stable menu roster. The pseudo slot is part of the control protocol, not a party slot. */
    fun roster(player: ServerPlayer): String = com.google.gson.JsonArray().also { out ->
        val session = dev.worldcombat.cobblemon.control.CompanionControl.session(player)
        val combat = CombatServices.get(player.server)
        owned(player).filter { combat.mayAct(combat.bind(it), player.uuid) }.sortedBy { it.pokemon.uuid.toString() }.forEach { entity ->
            val entry = com.google.gson.JsonObject()
            entry.addProperty("slot", session.pastureSlot(entity.pokemon.uuid)); entry.addProperty("id", entity.pokemon.uuid.toString())
            entry.addProperty("name", entity.pokemon.getDisplayName(false).string)
            entry.addProperty("pasture", true); out.add(entry)
        }
        val party = com.cobblemon.mod.common.Cobblemon.storage.getParty(player)
        for (slot in 0 until party.size()) party.get(slot)?.let { pokemon ->
            val entry = com.google.gson.JsonObject(); entry.addProperty("slot", slot)
            entry.addProperty("id", pokemon.uuid.toString()); entry.addProperty("name", pokemon.getDisplayName(false).string)
            entry.addProperty("pasture", false); out.add(entry)
        }
    }.toString()

    fun mayControl(entity: PokemonEntity, player: ServerPlayer): Boolean {
        if (!active(entity) || entity.tethering?.playerId != player.uuid || entity.pokemon.getOwnerUUID() != player.uuid) return false
        return true
    }
    fun capture(entity: PokemonEntity?): PastureView? {
        val tether = entity?.tethering ?: return null
        return PastureView(tether.tetheringId.toString(), entity.level().dimension().location().toString(),
            point(tether.pasturePos), point(tether.minRoamPos), point(tether.maxRoamPos),
            tether.playerId.toString(), entity.getBehaviourFlag(PokemonBehaviourFlag.PASTURE_CONFLICT))
    }
    private fun point(pos: BlockPos) = Point(pos.x.toDouble(), pos.y.toDouble(), pos.z.toDouble())
    fun allows(entity: PokemonEntity, point: Point): Boolean = entity.tethering?.canRoamTo(BlockPos.containing(point.x(), point.y(), point.z())) ?: true
    fun navigation(entity: PokemonEntity, goal: Point): String = when {
        entity.tethering == null -> ""
        !active(entity) -> "pasture-unavailable"
        !allows(entity, goal) -> "pasture-boundary"
        else -> ""
    }
    fun view(world: WorldAccess, actor: ActorHandle): PastureView? {
        world.check()
        val server = net.neoforged.neoforge.server.ServerLifecycleHooks.getCurrentServer() ?: return null
        val entity = CombatServices.get(server).inspect(actor) as? PokemonEntity ?: return null
        return capture(entity)
    }
    fun canRoam(world: WorldAccess, actor: ActorHandle, point: Point): Boolean {
        world.check(); require(point.length().isFinite())
        val server = net.neoforged.neoforge.server.ServerLifecycleHooks.getCurrentServer() ?: return false
        val entity = CombatServices.get(server).inspect(actor) as? PokemonEntity ?: return false
        return entity.tethering == null || active(entity) && allows(entity, point)
    }
}

/** Immutable, retention-safe native pasture facts for content, inspection and AI. Max is exclusive. */
class PastureView(private val tether: String, private val world: String, private val origin: Point,
    private val minimum: Point, private val maximum: Point, private val keeper: String, private val conflict: Boolean) {
    fun id() = tether
    fun dimension() = world
    fun position() = origin
    fun min() = minimum
    fun max() = maximum
    fun owner() = keeper
    fun combatAllowed() = conflict
    fun json(): String = com.google.gson.JsonObject().also { out ->
        out.addProperty("id", tether); out.addProperty("dimension", world); out.addProperty("owner", keeper)
        out.addProperty("combatAllowed", conflict)
        fun coordinates(p: Point) = com.google.gson.JsonArray().also { it.add(p.x()); it.add(p.y()); it.add(p.z()) }
        out.add("position", coordinates(origin)); out.add("min", coordinates(minimum)); out.add("max", coordinates(maximum))
    }.toString()
}
