package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.moves.Moves
import com.cobblemon.mod.common.api.abilities.Abilities
import net.minecraft.core.registries.BuiltInRegistries
import com.google.gson.GsonBuilder
import java.nio.file.Files
import java.nio.file.Path
import net.minecraft.server.MinecraftServer

object NativeScopeChecks {
    private var done = false
    @JvmStatic fun export(server: MinecraftServer) {
        if (done) return
        check(server.isSameThread)
        val ids = Moves.names().sorted()
        check(ids.size == 936) { "Locked native registry changed: ${ids.size}" }
        val facts = mapOf("moves" to ids, "abilities" to Abilities.all().map { it.name }.sorted(),
            "items" to BuiltInRegistries.ITEM.keySet().filter { it.namespace == "cobblemon" }.map { it.toString() }.sorted())
        Files.writeString(Path.of("native-registry.json"), GsonBuilder().setPrettyPrinting().create().toJson(facts))
        done = true
        println("P4CHECK exported ${ids.size} actual native move IDs")
    }
}
