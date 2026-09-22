package dev.worldcombat.core.mixin;

import dev.worldcombat.core.WorldCombatCore;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Turns off T88's network analyzer for the whole pack.
 *
 * The analyzer re-encodes every sent and received packet on a worker thread to measure it. Any payload
 * that decodes lazily from a one-shot buffer (Cobblemon's party sync is one) is emptied by that extra
 * encode before its real handler runs. Cancelling {@code record} at the head removes the hazard for every
 * mod at once and drops the per-packet reflection cost; {@code T88Compat} keeps the exact-id blacklist as
 * a fallback for the known Cobblemon packets. Pseudo: the mixin is skipped when T88 is absent.
 */
@Pseudo
@Mixin(targets = "cn.ussshenzhou.t88.networkanalyzer.NetworkWatcher", remap = false)
public abstract class T88NetworkWatcherMixin {
    @Unique
    private static boolean worldcombat$announced;

    @Inject(method = "record", at = @At("HEAD"), cancellable = true, remap = false)
    private static void worldcombat$skipPacketMeasurement(CallbackInfo ci) {
        if (!worldcombat$announced) {
            worldcombat$announced = true;
            WorldCombatCore.LOGGER.info("WorldCombat disabled the T88 network analyzer; packets are no longer re-encoded for measurement.");
        }
        ci.cancel();
    }
}
