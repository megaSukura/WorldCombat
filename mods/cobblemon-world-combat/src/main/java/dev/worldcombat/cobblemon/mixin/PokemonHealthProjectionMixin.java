package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.cobblemon.mod.common.entity.pokemon.PokemonServerDelegate;
import dev.worldcombat.cobblemon.PokemonHealthBridge;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Native acknowledged-HP tracking uses the same fractional projection as accepted damage and healing. */
@Mixin(value = PokemonServerDelegate.class, remap = false)
public abstract class PokemonHealthProjectionMixin {
    @Redirect(method = "updateHealth", at = @At(value = "INVOKE",
        target = "Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;setHealth(F)V"))
    private void worldcombat$projectHealth(PokemonEntity entity, float health) {
        PokemonHealthBridge.project(entity);
    }
}
