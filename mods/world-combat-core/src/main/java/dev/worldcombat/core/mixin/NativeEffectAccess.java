package dev.worldcombat.core.mixin;

import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

/** Native notifications following an already-authorized, atomic two-entity effect storage change. */
@Mixin(LivingEntity.class)
public interface NativeEffectAccess {
    @Invoker("onEffectAdded") void worldcombat$effectAdded(MobEffectInstance effect, Entity source);
    @Invoker("onEffectUpdated") void worldcombat$effectUpdated(MobEffectInstance effect, boolean attributes, Entity source);
    @Invoker("onEffectRemoved") void worldcombat$effectRemoved(MobEffectInstance effect);
}
