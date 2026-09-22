package dev.worldcombat.cobblemon.script

import com.cobblemon.mod.common.api.types.ElementalTypes
import com.cobblemon.mod.common.battles.ai.strongBattleAI.AIUtility

/** Read the locked native type table. This data lookup never creates or executes a battle. */
object PokemonTypeRelations {
    fun multiplier(attack: String, defence: String): Double {
        val a = requireNotNull(ElementalTypes.get(attack)) { "Unknown attacking type: $attack" }
        val d = requireNotNull(ElementalTypes.get(defence)) { "Unknown defending type: $defence" }
        return requireNotNull(AIUtility.typeEffectiveness[a]?.get(d)) {
            "No native type relation for $attack against $defence; supply a content rule for this pair"
        }
    }
}
