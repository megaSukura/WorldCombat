package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.pokemon.Pokemon

/** The legacy four-mechanism regression fixture now opts into its own native loadout. */
object P2Loadout {
    fun install(pokemon: Pokemon) {
        pokemon.moveSet.clear()
        listOf("swift", "protect", "rocktomb", "quickattack").forEachIndexed { slot, move ->
            pokemon.moveSet.setMove(slot, requireNotNull(Moves.getByName(move)).create())
        }
    }
}
