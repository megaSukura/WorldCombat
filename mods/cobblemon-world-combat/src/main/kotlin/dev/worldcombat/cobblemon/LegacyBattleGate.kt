package dev.worldcombat.cobblemon

import com.cobblemon.mod.common.battles.BattleStartError
import com.cobblemon.mod.common.battles.BattleStartResult
import com.cobblemon.mod.common.battles.ErroredBattleStart
import net.minecraft.network.chat.Component
import net.minecraft.world.entity.Entity
import java.util.concurrent.atomic.AtomicInteger

object LegacyBattleGate {
    val rejected = AtomicInteger()
    val prewarmSkipped = AtomicInteger()

    @JvmStatic
    fun reject(): BattleStartResult {
        rejected.incrementAndGet()
        return ErroredBattleStart()
    }

    @JvmStatic
    fun skipPrewarm() {
        prewarmSkipped.incrementAndGet()
        CobblemonWorldCombat.LOGGER.info("WorldCombat skipped the legacy battle prewarm; registry data stays available.")
    }
}
