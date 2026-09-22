package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.cobblemon.PokemonHealthBridge;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Commit the amount actually accepted by vanilla healing, including potion and mod effects. */
@Mixin(LivingEntity.class)
public abstract class PokemonWorldHealingMixin {
    @Inject(method = "heal", at = @At("RETURN"))
    private void worldcombat$commitHealing(float amount, CallbackInfo callback) {
        if ((Object) this instanceof PokemonEntity pokemon) PokemonHealthBridge.afterHealing(pokemon);
    }
}
