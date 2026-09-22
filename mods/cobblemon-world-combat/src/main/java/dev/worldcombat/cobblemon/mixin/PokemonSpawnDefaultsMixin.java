package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.config.CobblemonConfig;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Sparse incidental encounters. Saved native settings retain precedence over these initial defaults. */
@Mixin(CobblemonConfig.class)
public abstract class PokemonSpawnDefaultsMixin {
    @Inject(method = "<init>", at = @At("RETURN"))
    private void worldcombat$encounterDefaults(CallbackInfo ci) {
        var config = (CobblemonConfig) (Object) this;
        config.setPokemonPerChunk(0.15F);
        config.setTicksBetweenSpawnAttempts(120F);
        config.setMaximumSpawnsPerPass(2);
        config.setMinimumDistanceBetweenEntities(16F);
    }
}
