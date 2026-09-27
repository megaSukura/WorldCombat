package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeMountedMotion;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(Entity.class)
abstract class MountedMotionAuthorityMixin {
    @Inject(method="isControlledByLocalInstance",at=@At("HEAD"),cancellable=true)
    private void worldcombat$serverBody(CallbackInfoReturnable<Boolean> result) {
        var entity=(Entity)(Object)this;
        if (NativeMountedMotion.active(entity)) result.setReturnValue(!entity.level().isClientSide());
    }
}
