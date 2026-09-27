package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeAttackStarts;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Observe successful fresh insertion, after the native join/protection decision. */
@Mixin(ServerLevel.class)
public abstract class NativeProjectileStartMixin {
    @Inject(method = "addFreshEntity", at = @At("RETURN"))
    private void worldcombat$projectileStart(Entity entity, CallbackInfoReturnable<Boolean> callback) {
        if (callback.getReturnValueZ()) NativeAttackStarts.launched(entity);
    }
}
