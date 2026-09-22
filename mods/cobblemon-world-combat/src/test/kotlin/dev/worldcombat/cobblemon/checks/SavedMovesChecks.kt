package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.google.gson.JsonParser
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import java.nio.file.Files
import java.util.UUID

object SavedMovesChecks {
    private var done = false
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done) return
        done = true
        try {
            val expected = JsonParser.parseString(Files.readString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-moves-save.json"))).asJsonObject
            val pokemon = Cobblemon.storage.getParty(UUID.fromString(expected["owner"].asString), server.registryAccess())
                .first { it.uuid.toString() == expected["pokemon"].asString }
            val moves = expected.getAsJsonArray("moves")
            check(pokemon.moveSet.count() == moves.size())
            moves.forEachIndexed { slot, value ->
                val move = pokemon.moveSet[slot]!!; val row = value.asJsonObject
                check(move.name == row["id"].asString && move.currentPp == row["pp"].asInt
                    && move.maxPp == row["max"].asInt && move.raisedPpStages == row["raised"].asInt)
            }
            check(pokemon.entity == null)
            TestWorld.clean(CombatServices.get(server))
            println("P3CHECK PASS moves restart: original party restored native moves, remaining PP and raised PP stages")
        } catch (error: Throwable) {
            error.printStackTrace(); println("P3CHECK FAIL moves restart $error")
        }
    }
}
