package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.pokemon.Pokemon;
import dev.worldcombat.cobblemon.PokemonHealthBridge;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = Pokemon.class, remap = false)
public abstract class PokemonHealthMixin {
    @Unique private double worldcombat$initializationFraction;
    @Unique private int worldcombat$initializationAnchor;

    @Inject(method = "setCurrentHealth", at = @At("RETURN"))
    private void worldcombat$projectHealth(int value, CallbackInfo callback) {
        PokemonHealthBridge.nativeWrite((Pokemon) (Object) this);
    }

    @Inject(method = "initialize", at = @At("HEAD"))
    private void worldcombat$retainLoadedPrecision(CallbackInfoReturnable<Pokemon> callback) {
        Pokemon pokemon = (Pokemon) (Object) this;
        worldcombat$initializationFraction = PokemonHealthBridge.initializationFraction(pokemon);
        worldcombat$initializationAnchor = pokemon.getCurrentHealth();
    }

    @Inject(method = "initialize", at = @At("RETURN"))
    private void worldcombat$restoreLoadedPrecision(CallbackInfoReturnable<Pokemon> callback) {
        double fraction = worldcombat$initializationFraction;
        int anchor = worldcombat$initializationAnchor;
        worldcombat$initializationFraction = 0.0;
        worldcombat$initializationAnchor = 0;
        PokemonHealthBridge.afterInitialization((Pokemon) (Object) this, fraction, anchor);
    }
}
