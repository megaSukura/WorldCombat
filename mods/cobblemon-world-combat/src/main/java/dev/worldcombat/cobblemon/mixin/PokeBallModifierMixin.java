package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.pokeball.catching.CatchRateModifier;
import com.cobblemon.mod.common.pokeball.PokeBall;
import dev.worldcombat.cobblemon.script.CaptureContent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = PokeBall.class, remap = false)
public abstract class PokeBallModifierMixin {
    @Unique private CatchRateModifier worldcombat$modifier;
    @Inject(method = "getCatchRateModifier", at = @At("RETURN"), cancellable = true)
    private void worldcombat$nativeModifier(CallbackInfoReturnable<CatchRateModifier> callback) {
        if (worldcombat$modifier == null)
            worldcombat$modifier = CaptureContent.wrap(((PokeBall) (Object) this).getName().toString(), callback.getReturnValue());
        callback.setReturnValue(worldcombat$modifier);
    }
}
