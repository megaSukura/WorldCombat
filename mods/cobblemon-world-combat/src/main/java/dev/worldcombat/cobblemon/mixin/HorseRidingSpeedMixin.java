package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.riding.behaviour.types.land.HorseBehaviour;
import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.cobblemon.NativeRidingSpeed;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Horse walking is the native exception: it already includes the Minecraft movement attribute. */
@Mixin(value = HorseBehaviour.class, remap = false)
public abstract class HorseRidingSpeedMixin {
    @Inject(method = "getWalkSpeed", at = @At("RETURN"), cancellable = true)
    private void worldcombat$walkPolicy(PokemonEntity vehicle, CallbackInfoReturnable<Double> result) {
        result.setReturnValue(result.getReturnValue() * NativeRidingSpeed.policy(vehicle));
    }
}
