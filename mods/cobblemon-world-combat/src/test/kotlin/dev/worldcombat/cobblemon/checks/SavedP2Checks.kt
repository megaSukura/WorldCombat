package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.google.gson.JsonParser
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import java.nio.file.Files
import java.util.UUID

object SavedP2Checks {
    private var done = false
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done) return
        done = true
        try {
            val expected = JsonParser.parseString(Files.readString(server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-p2-save.json"))).asJsonObject
            val party = Cobblemon.storage.getParty(UUID.fromString(expected.get("owner").asString), server.registryAccess())
            val id = UUID.fromString(expected.get("pokemon").asString)
            check(party.count { it.uuid == id } == 1)
            val pokemon = party.first { it.uuid == id }
            check(pokemon.currentHealth == expected.get("health").asInt)
            check(pokemon.experience == expected.get("experience").asInt && pokemon.level == expected.get("level").asInt)
            val settings = pokemon.persistentData.getCompound("WorldCombat")
            check(settings.getString("Tactics") == "autonomous")
            check(settings.getInt("Permissions") == expected.get("permissions").asInt)
            check(settings.getInt("ChaseRange") == expected.get("range").asInt)
            check(pokemon.entity == null)
            TestWorld.clean(CombatServices.get(server))
            println("P2CHECK PASS restart: one captured partner, native HP/XP/level and tactical settings")
        } catch (error: Throwable) {
            error.printStackTrace()
            println("P2CHECK FAIL restart: $error")
        }
    }
}
