package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.google.gson.JsonParser
import dev.worldcombat.core.world.CombatServices
import net.minecraft.core.registries.BuiltInRegistries
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import java.nio.file.Files
import java.util.UUID

object SavedCombinationChecks {
    private var done = false
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        done = true
        try {
            val expected = JsonParser.parseString(Files.readString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-combination-save.json"))).asJsonObject
            val pokemon = Cobblemon.storage.getParty(UUID.fromString(expected["owner"].asString), server.registryAccess())
                .first { it.uuid.toString() == expected["pokemon"].asString }
            check(pokemon.species.name == "Bulbasaur" && pokemon.ability.name == "chlorophyll")
            check(pokemon.getStat(Stats.ATTACK) == expected["attack"].asInt && pokemon.evs.getOrDefault(Stats.ATTACK) == 0)
            check(pokemon.moveSet[0]!!.name == "disable" && pokemon.moveSet[0]!!.currentPp == expected["pp"].asInt)
            check(BuiltInRegistries.ITEM.getKey(pokemon.heldItem().item).toString() == "cobblemon:mystic_water" && pokemon.heldItem().count == 1)
            check(pokemon.entity == null)
            println("P4CHECK PASS combinations restart: original identity, native ability/stat changes, original move/PP and transferred held item restored")
        } catch (error: Throwable) { error.printStackTrace(); println("P4CHECK FAIL combinations restart $error") }
    }
}
