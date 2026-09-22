package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.api.pokemon.stats.Stats
import com.cobblemon.mod.common.pokemon.evolution.progress.DefeatEvolutionProgress
import com.cobblemon.mod.common.pokemon.evolution.progress.UseMoveEvolutionProgress
import com.google.gson.JsonParser
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import java.nio.file.Files
import java.util.UUID

object SavedGrowthChecks {
    private var done = false
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done) return
        done = true
        try {
            val expected = JsonParser.parseString(Files.readString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-growth-save.json"))).asJsonObject
            val party = Cobblemon.storage.getParty(UUID.fromString(expected["owner"].asString), server.registryAccess())
            expected.getAsJsonArray("pokemon").forEach { value ->
                val row = value.asJsonObject
                val pokemon = party.first { it.uuid.toString() == row["id"].asString }
                check(pokemon.species.name == row["species"].asString && pokemon.experience == row["experience"].asInt && pokemon.friendship == row["friendship"].asInt)
                check(pokemon.evs.getOrDefault(Stats.ATTACK) == row["atk"].asInt && pokemon.evs.getOrDefault(Stats.SPEED) == row["spe"].asInt)
                check(pokemon.evolutionProxy.server().progress().filterIsInstance<UseMoveEvolutionProgress>().sumOf { it.currentProgress().amount } == row["uses"].asInt)
                check(pokemon.evolutionProxy.server().progress().filterIsInstance<DefeatEvolutionProgress>().sumOf { it.currentProgress().amount } == row["defeats"].asInt) { "Defeat progress differs after restart: ${pokemon.uuid}" }
                check(pokemon.entity == null)
            }
            TestWorld.clean(CombatServices.get(server))
            println("P3CHECK PASS growth restart: native party, evolution, XP, EV, friendship and evolution progress persisted")
        } catch (error: Throwable) { error.printStackTrace(); println("P3CHECK FAIL growth restart $error") }
    }
}
