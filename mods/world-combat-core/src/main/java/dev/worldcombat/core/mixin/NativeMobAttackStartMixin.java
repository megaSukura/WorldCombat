package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeAttackStarts;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Base Mob contact execution. Private goals that bypass this method make no inferred start claim. */
@Mixin(Mob.class)
public abstract class NativeMobAttackStartMixin {
    @Inject(method = "doHurtTarget", at = @At("HEAD"))
    private void worldcombat$attackStart(Entity target, CallbackInfoReturnable<Boolean> callback) {
        NativeAttackStarts.melee((Mob) (Object) this, target, "");
    }
}
