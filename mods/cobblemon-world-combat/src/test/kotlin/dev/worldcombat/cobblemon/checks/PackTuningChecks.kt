package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.CobblemonEntities
import com.cobblemon.mod.common.api.pokemon.PokemonProperties
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity
import com.google.gson.JsonParser
import dev.worldcombat.cobblemon.config.WorldCombatConfig
import dev.worldcombat.core.world.CombatServices
import net.minecraft.server.MinecraftServer
import net.minecraft.world.entity.EntityType

/** Runs once on a hidden server using actual config, native PP serializers and navigation hooks. */
object PackTuningChecks {
    private var done=false
    @JvmStatic fun tick(server:MinecraftServer) {
        if(done||!CombatServices.CONTENT.ready())return
        done=true
        try {
            NativePackConfigChecks.run(server)
            val combat=CombatServices.get(server);val level=server.overworld();level.getChunk(0,0)
            val oldIdle=WorldCombatConfig.ENCOUNTER_IDLE_TICKS.get()
            val oldBase=WorldCombatConfig.MOBILITY_BASE.get();val oldGrowth=WorldCombatConfig.MOBILITY_GROWTH.get()
            val oldMin=WorldCombatConfig.MOBILITY_MINIMUM.get();val oldMax=WorldCombatConfig.MOBILITY_MAXIMUM.get()
            try {
                WorldCombatConfig.ENCOUNTER_IDLE_TICKS.set(16000)
                WorldCombatConfig.MOBILITY_BASE.set(2.0);WorldCombatConfig.MOBILITY_GROWTH.set(0.0)
                WorldCombatConfig.MOBILITY_MINIMUM.set(0.0);WorldCombatConfig.MOBILITY_MAXIMUM.set(0.0)
                val zombie=EntityType.ZOMBIE.create(level)!!;zombie.moveTo(0.0,-60.0,0.0);zombie.isNoAi=true;level.addFreshEntity(zombie)
                val read=JsonParser.parseString(combat.runtime().event("checks:pack/tuning",combat.bind(zombie),null,"{}",true).data()).asJsonObject
                check(read.get("idle").asInt==16000&&read.get("stageIdle").asInt==16000&&read.get("remaining").asInt==16000) { "Config timing/lease: $read" }
                check(read.get("base").asDouble==2.0) { "Rhino read config as a fallback instead of a number: $read" }
                val pokemon=PokemonProperties.parse("rattata level=20").create()
                val entity=PokemonEntity(level,pokemon,CobblemonEntities.POKEMON);entity.moveTo(4.0,-60.0,0.0);level.addFreshEntity(entity)
                val actor=combat.bind(entity)
                val movement=JsonParser.parseString(combat.runtime().event("world_combat:navigate",actor,null,"""{"speed":0.3}""",true).data()).asJsonObject
                check(kotlin.math.abs(movement.get("speed").asDouble-0.6)<1e-5) { "Config navigation multiplier: $movement" }
            } finally {
                WorldCombatConfig.ENCOUNTER_IDLE_TICKS.set(oldIdle)
                WorldCombatConfig.MOBILITY_BASE.set(oldBase);WorldCombatConfig.MOBILITY_GROWTH.set(oldGrowth)
                WorldCombatConfig.MOBILITY_MINIMUM.set(oldMin);WorldCombatConfig.MOBILITY_MAXIMUM.set(oldMax)
            }
            println("REVIEWCHECK PASS: native PP multiplier/PP Up/learning/storage/wide packet, fractional capacity and no refill; runtime config bridge, movement mapping and long stage lifetime")
        } catch(error:Throwable) {error.printStackTrace();println("REVIEWCHECK FAIL: $error")}
        finally {server.halt(false)}
    }
}
