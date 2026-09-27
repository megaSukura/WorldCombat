package dev.worldcombat.core.mixin;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.memory.MemoryModuleType;
import net.minecraft.world.entity.ai.sensing.HurtBySensor;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Retaliation memories keep external attackers; self-attribution remains in native damage history. */
@Mixin(HurtBySensor.class)
public abstract class NativeSelfHarmSensorMixin {
    @Redirect(method = "doTick(Lnet/minecraft/server/level/ServerLevel;Lnet/minecraft/world/entity/LivingEntity;)V",
        at = @At(value = "INVOKE", target = "Lnet/minecraft/world/damagesource/DamageSource;getEntity()Lnet/minecraft/world/entity/Entity;"))
    private Entity worldcombat$retaliationSource(DamageSource cause, ServerLevel level, LivingEntity entity) {
        var source = cause.getEntity(); return source == entity ? null : source;
    }
    @Inject(method = "doTick(Lnet/minecraft/server/level/ServerLevel;Lnet/minecraft/world/entity/LivingEntity;)V", at = @At("TAIL"))
    private void worldcombat$oldSelfMemory(ServerLevel level, LivingEntity entity, CallbackInfo callback) {
        if (entity.getBrain().getMemory(MemoryModuleType.HURT_BY_ENTITY).orElse(null) == entity)
            entity.getBrain().eraseMemory(MemoryModuleType.HURT_BY_ENTITY);
    }
}
