package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeDamageFloor;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Clamp after all native Pre listeners; absorption may further reduce this hit. */
@Mixin(value = CommonHooks.class, remap = false)
abstract class NativeDamageFloorMixin {
    @Inject(method = "onLivingDamagePre", at = @At("RETURN"), cancellable = true)
    private static void worldcombat$healthFloor(LivingEntity entity, DamageContainer container, CallbackInfoReturnable<Float> result) {
        float amount = NativeDamageFloor.limit(entity, container.getSource(), result.getReturnValueF());
        if (amount != result.getReturnValueF()) { container.setNewDamage(amount); result.setReturnValue(amount); }
    }
}
