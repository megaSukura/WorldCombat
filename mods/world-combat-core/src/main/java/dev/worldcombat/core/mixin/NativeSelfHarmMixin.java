package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeSelfHarm;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LivingEntity.class)
public abstract class NativeSelfHarmMixin {
    @Inject(method = "setLastHurtByMob", at = @At("HEAD"), cancellable = true)
    private void worldcombat$selfCost(LivingEntity attacker, CallbackInfo callback) {
        var entity = (LivingEntity) (Object) this;
        if (attacker == entity && NativeSelfHarm.active(entity)) callback.cancel();
    }
}
