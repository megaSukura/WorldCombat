package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.battles.BattleRegistry;
import com.cobblemon.mod.common.battles.BattleStartResult;
import dev.worldcombat.cobblemon.LegacyBattleGate;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = BattleRegistry.class, remap = false)
public abstract class BattleRegistryMixin {
    @Inject(method = "startBattle", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$reject(CallbackInfoReturnable<BattleStartResult> callback) {
        callback.setReturnValue(LegacyBattleGate.reject());
    }
}
