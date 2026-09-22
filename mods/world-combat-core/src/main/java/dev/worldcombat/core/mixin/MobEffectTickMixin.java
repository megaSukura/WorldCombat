package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Exposes the native effect clock to content without interpreting any effect or ability. */
@Mixin(MobEffectInstance.class)
public abstract class MobEffectTickMixin {
    @Redirect(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/effect/MobEffect;applyEffectTick(Lnet/minecraft/world/entity/LivingEntity;I)Z"))
    private boolean worldcombat$effectTick(MobEffect effect, LivingEntity entity, int amplifier) {
        if (entity.level() instanceof ServerLevel level && !CombatServices.get(level.getServer()).mobEffectTick(entity, effect, amplifier)) return true;
        return effect.applyEffectTick(entity, amplifier);
    }
}
