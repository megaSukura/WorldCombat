package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import dev.worldcombat.cobblemon.script.NativeParty
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.runtime.WorldAccess
import dev.worldcombat.core.world.MinecraftCombat
import net.minecraft.server.level.ServerPlayer
import kotlin.math.ceil

/** Two same-species individuals prove stable party identity, independent of species and stale slot intent. */
object NativePartyChecks {
    fun run(combat: MinecraftCombat, actor: PokemonEntity, owner: ServerPlayer) {
        val store = Cobblemon.storage.getParty(owner)
        val first = PokemonProperties.parse("eevee level=15").create()
        val second = PokemonProperties.parse("eevee level=15").create()
        check(store.add(first) && store.add(second))
        try {
            first.currentHealth = 0; second.currentHealth = 0
            val slot = store.indexOf(first)
            val world = WorldAccess(combat.runtime(), combat.bind(actor), owner.uuid, {}, true, 0)
            fun result(expected: String) = JsonParser.parseString(NativeParty.reviveResult(world, combat.bind(actor), slot, .5, expected)).asJsonObject
            val stale = result(second.uuid.toString())
            check(!stale.get("ok").asBoolean && stale.get("reason").asString == "member-changed")
            check(first.isFainted() && second.isFainted())
            check(result(first.uuid.toString()).get("ok").asBoolean)
            check(first.currentHealth == ceil(first.maxHealth * .5).toInt() && second.isFainted() && first.entity == null)
            check(!result(first.uuid.toString()).get("ok").asBoolean)
            check(JsonParser.parseString(NativeParty.reviveResult(world, combat.bind(actor), store.indexOf(second), .5)).asJsonObject.get("ok").asBoolean)
            TestWorld.mark("Native party revive verified: exact same-species identity, stale refusal, half health, inactive result and legacy compatibility")
        } finally { store.remove(first); store.remove(second) }
    }
}
