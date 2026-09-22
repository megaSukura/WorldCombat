package dev.worldcombat.cobblemon.checks

import com.cobblemon.mod.common.api.moves.Move
import com.cobblemon.mod.common.api.moves.Moves
import dev.worldcombat.cobblemon.config.WorldCombatConfig
import io.netty.buffer.Unpooled
import net.minecraft.nbt.CompoundTag
import net.minecraft.network.RegistryFriendlyByteBuf
import net.minecraft.server.MinecraftServer
import com.google.gson.JsonObject

/**
 * Neutral native-PP checks over real Cobblemon objects: no content unit is loaded or implied. They pin the shared
 * contract behind the pack PP multiplier so a build can verify it directly:
 *  - the scaled base PP is the single source for the template base, the three-stage catalogue maximum and each move,
 *  - learning starts at the scaled base and an explicit restore keeps the stored PP and stages,
 *  - a legal current PP above 255 survives the packet round trip,
 *  - the native NBT and JSON paths keep the same explicit value.
 *
 * Coordinator-only: call `run(server)` from a check scenario once the native moves registry is loaded. It temporarily
 * raises the PP capacity and restores it, so run it outside live combat.
 */
object NativePackConfigChecks {
    private val templateId = "tackle"

    @JvmStatic fun run(server: MinecraftServer) {
        val template = Moves.getByName(templateId) ?: error("native move $templateId is missing")
        val nativeBase = template.pp
        check(nativeBase > 0) { "native base PP should be positive" }

        // Identity at the default multiplier.
        check(template.create().currentPp == nativeBase) { "learning starts at the native base PP" }
        check(template.create().maxPp == nativeBase) { "a fresh move's maximum is its base PP at zero stages" }

        // Explicit restore must not refill or re-scale: the stored current PP and stages are kept.
        val restored = template.create(1, 2)
        check(restored.raisedPpStages == 2) { "explicit restore keeps the raised PP stages" }
        check(restored.currentPp == 1) { "explicit restore keeps the stored current PP" }
        check(restored.maxPp == nativeBase + 2 * nativeBase / 5) { "raised stages derive from the scaled base" }

        val previous = WorldCombatConfig.PP_CAPACITY.get()
        try {
            WorldCombatConfig.PP_CAPACITY.set(10.0)
            val scaledBase = template.pp
            check(scaledBase > 255) { "multiplier 10 should push the base PP above a byte" }
            check(scaledBase == Math.round(nativeBase * 10.0).toInt()) { "base PP is round(base * multiplier)" }

            val learned = template.create()
            check(learned.currentPp == scaledBase) { "learning fills the scaled base PP" }
            check(learned.maxPp == scaledBase) { "learning max equals the scaled base at zero stages" }
            check(template.maxPp == 8 * scaledBase / 5) { "catalogue maximum is the three-stage scaled value" }

            val explicit = template.create(400, 3)
            check(explicit.currentPp == 400) { "an explicit stored PP is not refilled" }
            check(explicit.maxPp == scaledBase + 3 * scaledBase / 5) { "three stages scale from the same base" }

            // Packet round trip of a balance above 255.
            val buffer = RegistryFriendlyByteBuf(Unpooled.buffer(), server.registryAccess())
            val decoded: Move
            try {
                explicit.saveToBuffer(buffer)
                decoded = Move.loadFromBuffer(buffer)
            } finally {
                buffer.release()
            }
            check(decoded.currentPp == explicit.currentPp) { "packet kept the wide current PP: ${decoded.currentPp}" }
            check(decoded.raisedPpStages == explicit.raisedPpStages) { "packet kept the raised PP stages" }

            // Native NBT and JSON paths keep the same explicit value.
            check(Move.loadFromNBT(explicit.saveToNBT(CompoundTag())).currentPp == explicit.currentPp) {
                "NBT kept the explicit current PP"
            }
            check(Move.loadFromJSON(explicit.saveToJSON(JsonObject())).currentPp == explicit.currentPp) {
                "JSON kept the explicit current PP"
            }

            // PP Up still moves the maximum from the scaled base without touching the stages' cap.
            val up = template.create()
            val before = up.maxPp
            check(up.raiseMaxPP(1)) { "the first PP Up should raise the maximum" }
            check(up.maxPp > before) { "PP Up raises the maximum on the scaled capacity" }
            WorldCombatConfig.PP_CAPACITY.set(0.5)
            check(template.pp == Math.round(nativeBase * 0.5).toInt())
            check(explicit.currentPp == explicit.maxPp) { "Shrinking capacity clamps a stored balance" }
            val shrunk = explicit.copy()
            val spent = shrunk.currentPp
            WorldCombatConfig.PP_CAPACITY.set(2.0)
            check(shrunk.currentPp == spent) { "Raising capacity must not refill an already saved balance" }
        } finally {
            WorldCombatConfig.PP_CAPACITY.set(previous)
        }

        check(template.pp == nativeBase) { "restoring the multiplier restores the identity base" }
        println("NATIVEPPCHECK scaled base, learning, explicit restore, storage and wide packet round trip passed")
    }
}
