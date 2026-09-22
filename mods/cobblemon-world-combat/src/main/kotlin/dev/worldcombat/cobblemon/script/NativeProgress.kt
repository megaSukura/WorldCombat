package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.moves.MoveTemplate
import com.cobblemon.mod.common.pokemon.Pokemon
import com.cobblemon.mod.common.pokemon.evolution.progress.*
import com.cobblemon.mod.common.pokemon.requirements.DefeatRequirement

/** Storage adapters for native counters. Trigger selection and amounts belong to scripts. */
internal object NativeProgress {
    val ids = setOf("use_move", "defeat", "damage_taken", "recoil", "critical_hits")
    private fun sum(before: Int, amount: Int) = (before.toLong() + amount).coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
    fun add(pokemon: Pokemon, id: String, amount: Int, move: MoveTemplate?, target: Pokemon?) {
        if (amount == 0) return
        val controller = pokemon.evolutionProxy.server()
        when (id) {
            "use_move" -> if (move != null && UseMoveEvolutionProgress.supports(pokemon, move)) {
                val record = controller.progressFirstOrCreate({ it is UseMoveEvolutionProgress && it.currentProgress().move == move }) { UseMoveEvolutionProgress() }
                record.updateProgress(UseMoveEvolutionProgress.Progress(move, sum(record.currentProgress().amount, amount)))
            }
            "defeat" -> if (target != null) {
                pokemon.lockedEvolutions.flatMap { it.requirements.filterIsInstance<DefeatRequirement>() }
                    .distinctBy { it.target.originalString.lowercase() }.filter { it.target.matches(target) }.forEach { requirement ->
                        val record = controller.progressFirstOrCreate({ it is DefeatEvolutionProgress &&
                            it.currentProgress().target.originalString.equals(requirement.target.originalString, true) }) { DefeatEvolutionProgress() }
                        record.updateProgress(DefeatEvolutionProgress.Progress(requirement.target, sum(record.currentProgress().amount, amount)))
                    }
            }
            "damage_taken" -> if (DamageTakenEvolutionProgress.supports(pokemon)) {
                val record = controller.progressFirstOrCreate({ it is DamageTakenEvolutionProgress }) { DamageTakenEvolutionProgress() }
                record.updateProgress(DamageTakenEvolutionProgress.Progress(sum(record.currentProgress().amount, amount)))
            }
            "recoil" -> if (RecoilEvolutionProgress.supports(pokemon)) {
                val record = controller.progressFirstOrCreate({ it is RecoilEvolutionProgress }) { RecoilEvolutionProgress() }
                record.updateProgress(RecoilEvolutionProgress.Progress(sum(record.currentProgress().recoil, amount)))
            }
            "critical_hits" -> if (LastBattleCriticalHitsEvolutionProgress.supports(pokemon)) {
                val record = controller.progressFirstOrCreate({ it is LastBattleCriticalHitsEvolutionProgress }) { LastBattleCriticalHitsEvolutionProgress() }
                record.updateProgress(LastBattleCriticalHitsEvolutionProgress.Progress(sum(record.currentProgress().amount, amount)))
            }
            else -> require(id in ids)
        }
        pokemon.onChange()
    }
}
