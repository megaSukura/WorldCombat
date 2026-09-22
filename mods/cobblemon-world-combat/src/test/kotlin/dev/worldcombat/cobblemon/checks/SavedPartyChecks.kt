package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.google.gson.JsonParser
import dev.worldcombat.core.checks.TestWorld
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.level.storage.LevelResource
import java.nio.file.Files
import java.util.UUID

object SavedPartyChecks {
    private var done = false
    @JvmStatic
    fun tick(server: MinecraftServer) {
        if (done) return
        done = true
        try {
            val path = server.getWorldPath(LevelResource.ROOT).resolve("worldcombat-save-check.json")
            val expected = JsonParser.parseString(Files.readString(path)).asJsonObject
            val owner = UUID.fromString(expected.get("owner").asString)
            val id = UUID.fromString(expected.get("pokemon").asString)
            val pokemon = Cobblemon.storage.getParty(owner, server.registryAccess()).firstOrNull { it.uuid == id }
                ?: error("The original party store did not restore the partner")
            check(pokemon.currentHealth == expected.get("health").asInt)
            check(pokemon.experience == expected.get("experience").asInt)
            check(pokemon.level == expected.get("level").asInt)
            check(pokemon.entity == null)
            TestWorld.clean(CombatServices.get(server))
            TestWorld.mark("PASS restart: original party restored identity, HP, experience and level")
        } catch (error: Throwable) {
            error.printStackTrace()
            TestWorld.mark("FAIL restart: " + error)
        }
    }
}
