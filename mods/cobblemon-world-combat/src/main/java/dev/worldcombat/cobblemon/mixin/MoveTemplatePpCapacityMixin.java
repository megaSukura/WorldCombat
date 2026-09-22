package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.moves.Move;
import com.cobblemon.mod.common.api.moves.MoveTemplate;
import dev.worldcombat.cobblemon.config.WorldCombatConfig;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Makes the pack-scaled base PP the single source every other PP figure derives from. Kotlin reads its own constructor
 * {@code pp} field directly, so both the public base getter and the catalogue maximum are scaled here; {@code Move}
 * then consumes the scaled base through {@code template.pp} without multiplying again.
 */
@Mixin(MoveTemplate.class)
public abstract class MoveTemplatePpCapacityMixin {
    @Inject(method = "getPp()I", at = @At("RETURN"), cancellable = true)
    private void worldcombat$scaleBasePp(CallbackInfoReturnable<Integer> cir) {
        cir.setReturnValue(WorldCombatConfig.scalePp(cir.getReturnValue()));
    }

    /** Native maximum is the three-stage value {@code 8 * base / 5}; compute it from the same scaled base. */
    @Inject(method = "getMaxPp()I", at = @At("RETURN"), cancellable = true)
    private void worldcombat$scaleMaxPp(CallbackInfoReturnable<Integer> cir) {
        int base = ((MoveTemplate) (Object) this).getPp();
        cir.setReturnValue(8 * base / 5);
    }

    /** A freshly learned move starts at the scaled base PP, native {@code create()} semantics kept. */
    @Inject(method = "create()Lcom/cobblemon/mod/common/api/moves/Move;", at = @At("HEAD"), cancellable = true)
    private void worldcombat$scaleCreatedPp(CallbackInfoReturnable<Move> cir) {
        MoveTemplate self = (MoveTemplate) (Object) this;
        cir.setReturnValue(self.create(self.getPp()));
    }
}
