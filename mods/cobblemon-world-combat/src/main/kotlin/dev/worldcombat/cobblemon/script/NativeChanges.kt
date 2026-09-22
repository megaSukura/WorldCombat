package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.pokemon.Pokemon
import dev.worldcombat.core.world.CombatServices
import net.neoforged.neoforge.server.ServerLifecycleHooks

/** Bridges Cobblemon's per-Pokemon change notifications to the host's `actor_changed` topic for the Pokemon's live entity. */
object NativeChanges {
    @JvmStatic fun changed(pokemon: Pokemon) {
        val server = ServerLifecycleHooks.getCurrentServer() ?: return
        if (!server.isSameThread) return
        PokemonViews.invalidate(pokemon)
        val entity = pokemon.entity ?: return
        if (entity.level().isClientSide) return
        CombatServices.get(server).actorChanged(entity)
    }
}
