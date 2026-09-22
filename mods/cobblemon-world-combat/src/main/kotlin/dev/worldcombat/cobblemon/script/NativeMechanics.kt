package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.pokemon.status.Statuses
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.status.PersistentStatus
import com.cobblemon.mod.common.pokemon.status.PersistentStatusContainer
import dev.worldcombat.core.runtime.*
import dev.worldcombat.core.world.CombatServices
import net.minecraft.resources.ResourceLocation
import net.minecraft.world.item.ItemStack
import net.neoforged.neoforge.server.ServerLifecycleHooks
import java.util.WeakHashMap
import java.util.UUID

/** Native identity, compare-and-write operations and temporary execution leases. Rules live in content. */
object NativeMechanics {
    private data class Held(val stack: ItemStack, val key: String)
    private val held = WeakHashMap<Pokemon, Held>()
    private val statuses = WeakHashMap<PersistentStatusContainer, String>()
    private val statusLeases = WeakHashMap<Pokemon, Long>()
    @Synchronized fun heldChanged(pokemon: Pokemon) { held.remove(pokemon) }
    @Synchronized fun heldKey(pokemon: Pokemon): String {
        val current = pokemon.heldItem(); val previous = held[pokemon]
        if (previous != null && ItemStack.matches(previous.stack, current)) return previous.key
        return UUID.randomUUID().toString().also { held[pokemon] = Held(current.copy(), it) }
    }
    fun statusKey(pokemon: Pokemon) = pokemon.status?.let { statuses.getOrPut(it) { UUID.randomUUID().toString() } } ?: ""
    private fun pokemon(world: WorldAccess, actor: ActorHandle): Pokemon {
        world.requireMutation(actor)
        val server = ServerLifecycleHooks.getCurrentServer() ?: throw ActionInactiveException("Server stopped")
        return (CombatServices.get(server).resolve(actor) as? PokemonEntity)?.pokemon ?: throw ActionInactiveException("Pokemon left")
    }
    fun status(world: WorldAccess, actor: ActorHandle, id: String, seconds: Int, expected: String): Boolean {
        val pokemon = pokemon(world, actor)
        if (statusKey(pokemon) != expected) return false
        require(seconds in 0..86400)
        if (id.isEmpty()) pokemon.status = null
        else {
            val status = Statuses.getStatus(ResourceLocation.parse(id)) as? PersistentStatus ?: throw IllegalArgumentException("Unknown persistent status")
            pokemon.status = PersistentStatusContainer(status, seconds)
        }
        return true
    }
    fun statusSeconds(world: WorldAccess, actor: ActorHandle, seconds: Int, expected: String): Boolean {
        val pokemon = pokemon(world, actor); require(seconds in 0..86400)
        if (statusKey(pokemon) != expected || pokemon.status == null) return false
        if (seconds == 0) pokemon.status = null else { pokemon.status!!.secondsLeft = seconds; pokemon.onChange() }
        return true
    }
    /** Adopts one exact native status container into the caller's action/effect lifetime. */
    fun statusMirror(world: WorldAccess, actor: ActorHandle, expected: String): Boolean {
        val pokemon = pokemon(world, actor)
        val container = pokemon.status ?: return false
        if (statusKey(pokemon) != expected) return false
        world.lease(actor, Runnable { if (pokemon.status === container) pokemon.status = null })
        return true
    }
    fun consumeHeld(world: WorldAccess, actor: ActorHandle, expected: String, count: Int): Boolean {
        val pokemon = pokemon(world, actor); require(count in 1..64)
        val before = pokemon.heldItem()
        if (heldKey(pokemon) != expected || before.isEmpty || before.count < count) return false
        val remaining = before.copy().also { it.shrink(count) }
        pokemon.swapHeldItem(remaining, decrement = false)
        return ItemStack.matches(pokemon.heldItem(), remaining)
    }
    fun pp(world: WorldAccess, actor: ActorHandle, slot: Int, expectedMove: String, expectedPp: Int, value: Int): Boolean {
        val pokemon = pokemon(world, actor); require(slot in 0..3)
        val move = pokemon.moveSet[slot] ?: return false
        if (NativeMoveKeys.key(move) != expectedMove || move.currentPp != expectedPp) return false
        require(value in 0..move.maxPp)
        move.currentPp = value
        return true
    }
    /** Content takes over the native status clock for this Pokemon until it releases the lease (its individual effect ending). */
    fun statusLease(world: WorldAccess, actor: ActorHandle) {
        statusLeases[pokemon(world, actor)] = Long.MAX_VALUE
    }
    fun statusRelease(world: WorldAccess, actor: ActorHandle) {
        statusLeases.remove(pokemon(world, actor))
    }
    @JvmStatic fun managesStatus(pokemon: Pokemon): Boolean {
        val server = ServerLifecycleHooks.getCurrentServer() ?: return false
        return CombatServices.CONTENT.ready() && pokemon.entity != null && (statusLeases[pokemon] ?: -1) >= server.tickCount
    }
    fun record(world: WorldAccess, actor: ActorHandle, id: String, amount: Int) {
        val pokemon = pokemon(world, actor); require(id in NativeProgress.ids && amount in 0..1000000)
        NativeProgress.add(pokemon, id, amount, null, null)
    }
    fun resetCritical(world: WorldAccess, actor: ActorHandle) {
        val pokemon = pokemon(world, actor)
        pokemon.evolutionProxy.server().progress().forEach {
            if (it is com.cobblemon.mod.common.pokemon.evolution.progress.LastBattleCriticalHitsEvolutionProgress)
                it.updateProgress(com.cobblemon.mod.common.pokemon.evolution.progress.LastBattleCriticalHitsEvolutionProgress.Progress(0))
        }
        pokemon.onChange()
    }
}
