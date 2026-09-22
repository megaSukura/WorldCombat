package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.moves.Move;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Keeps an individual balance inside the pack-scaled capacity. The maximum itself needs no scaling here: {@code Move}
 * derives it from {@code template.pp}, which {@code MoveTemplatePpCapacityMixin} already scales, so multiplying again
 * would double apply the multiplier. Reading a stored current PP above the new maximum clamps it without refilling;
 * native save, JSON, codec and buffer paths read through this getter, so the legal value is what gets persisted.
 */
@Mixin(Move.class)
public abstract class MovePpCapacityMixin {
    @Inject(method = "getCurrentPp()I", at = @At("RETURN"), cancellable = true)
    private void worldcombat$clampCurrentPp(CallbackInfoReturnable<Integer> cir) {
        int maximum = ((Move) (Object) this).getMaxPp();
        if (cir.getReturnValue() > maximum) cir.setReturnValue(maximum);
        else if (cir.getReturnValue() < 0) cir.setReturnValue(0);
    }
}
