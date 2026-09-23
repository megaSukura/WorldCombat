package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.cobblemon.script.NativePasture;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(PokemonEntity.class)
public abstract class PokemonPastureMixin {
    @Inject(method = "tick", at = @At("HEAD"))
    private void worldcombat$pastureStorage(CallbackInfo ci) {
        // Before the native delegate restores SentOutState and before either AI runs.
        NativePasture.synchronize((PokemonEntity) (Object) this);
    }

    @Inject(method = "checkPastureTether", at = @At("RETURN"))
    private void worldcombat$pastureLifecycle(CallbackInfo ci) {
        NativePasture.track((PokemonEntity) (Object) this);
    }
}
