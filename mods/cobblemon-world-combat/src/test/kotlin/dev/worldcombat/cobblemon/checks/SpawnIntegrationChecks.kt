package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.Cobblemon
import com.cobblemon.mod.common.CobblemonEntities
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.config.CobblemonConfig
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.Gson
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.entity.EntityType
import net.minecraft.world.entity.MobCategory
import net.minecraft.world.level.ChunkPos
import net.minecraft.world.level.LocalMobCapCalculator
import net.minecraft.world.level.NaturalSpawner

/** Exercises NeoForge's actual census rather than a parallel approximation of its population rules. */
object SpawnIntegrationChecks {
    private var done = false
    @JvmStatic fun tick(server: MinecraftServer) {
        if (done || !CombatServices.CONTENT.ready()) return
        done = true
        try {
            val level = server.overworld()
            val pokemon = PokemonEntity(level, PokemonProperties.parse("rattata level=5").create(), CobblemonEntities.POKEMON)
            val pig = EntityType.PIG.create(level)!!
            pokemon.moveTo(0.0, -60.0, 0.0); pig.moveTo(4.0, -60.0, 0.0)
            check(pokemon.getClassification(false) == MobCategory.CREATURE)
            check(pokemon.getClassification(true) == MobCategory.MISC)
            check(pig.getClassification(true) == MobCategory.CREATURE)
            val census = NaturalSpawner.createState(289, listOf(pokemon, pig), { position, consumer ->
                consumer.accept(level.getChunk(ChunkPos.getX(position), ChunkPos.getZ(position)))
            }, LocalMobCapCalculator(level.chunkSource.chunkMap))
            check(census.mobCategoryCounts.getInt(MobCategory.CREATURE) == 1) { "Pokemon consumed another animal's spawn budget" }
            val defaults = CobblemonConfig()
            check(defaults.pokemonPerChunk == 0.15F && defaults.ticksBetweenSpawnAttempts == 120F)
            check(defaults.maximumSpawnsPerPass == 2 && defaults.minimumDistanceBetweenEntities == 16.0)
            check(Cobblemon.config.pokemonPerChunk == defaults.pokemonPerChunk)
            val saved = Gson().fromJson("""{"pokemonPerChunk":0.4,"ticksBetweenSpawnAttempts":80}""", CobblemonConfig::class.java)
            check(saved.pokemonPerChunk == 0.4F && saved.ticksBetweenSpawnAttempts == 80F) { "Saved native settings lost precedence" }
            println("REVIEWCHECK PASS: native spawn census keeps pig allowance, Pokemon retain their category outside census, sparse defaults and saved settings work")
        } catch (failure: Throwable) {
            println("REVIEWCHECK FAIL: $failure"); failure.printStackTrace()
        } finally { server.halt(false) }
    }
}
