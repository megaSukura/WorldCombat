package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeDamageReceipts;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.damagesource.DamageContainer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = CommonHooks.class, remap = false)
abstract class NativeDamageStageMixin {
    @Inject(method = "onEntityIncomingDamage", at = @At("HEAD"))
    private static void worldcombat$incoming(LivingEntity entity, DamageContainer container, CallbackInfoReturnable<Boolean> result) {
        NativeDamageReceipts.incoming(entity, container);
    }
    @Inject(method = "onEntityIncomingDamage", at = @At("RETURN"))
    private static void worldcombat$incomingEnded(LivingEntity entity, DamageContainer container, CallbackInfoReturnable<Boolean> result) {
        NativeDamageReceipts.incomingEnded(entity, container, result.getReturnValueZ());
    }
    @Inject(method = "onLivingDamagePre", at = @At("RETURN"))
    private static void worldcombat$prepared(LivingEntity entity, DamageContainer container, CallbackInfoReturnable<Float> result) {
        NativeDamageReceipts.prepared(entity, container);
    }
    @Inject(method = "onLivingDamagePost", at = @At("HEAD"))
    private static void worldcombat$applied(LivingEntity entity, DamageContainer container, CallbackInfo result) {
        NativeDamageReceipts.applied(entity, container);
    }
}
