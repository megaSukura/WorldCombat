package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.core.world.CombatServices;
import net.minecraft.server.level.ServerLevel;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(PokemonEntity.class)
public abstract class PokemonMovementMixin {
    @Inject(method = "customServerAiStep", at = @At("HEAD"), cancellable = true)
    private void worldcombat$brainLease(CallbackInfo ci) {
        var entity = (PokemonEntity) (Object) this;
        if (entity.level() instanceof ServerLevel level && CombatServices.get(level.getServer()).controls(entity)) ci.cancel();
    }
}
