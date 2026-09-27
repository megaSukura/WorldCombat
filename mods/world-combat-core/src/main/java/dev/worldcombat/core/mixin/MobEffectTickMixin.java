package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import dev.worldcombat.core.world.NativeEffectClock;
import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Exposes the native effect clock to content without interpreting any effect or ability. */
@Mixin(MobEffectInstance.class)
public abstract class MobEffectTickMixin implements NativeEffectClock {
    @Unique private long worldcombat$naturalTicks;
    @Override public long worldcombat$naturalTicks() { return worldcombat$naturalTicks; }
    @WrapMethod(method = "tickDownDuration")
    private int worldcombat$naturalCountdown(Operation<Integer> original) {
        int before=((MobEffectInstance)(Object)this).getDuration();
        int after=original.call();
        if(before!=-1&&after==before-1)worldcombat$naturalTicks++;
        return after;
    }
    @Redirect(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/effect/MobEffect;applyEffectTick(Lnet/minecraft/world/entity/LivingEntity;I)Z"))
    private boolean worldcombat$effectTick(MobEffect effect, LivingEntity entity, int amplifier) {
        if (entity.level() instanceof ServerLevel level && !CombatServices.get(level.getServer()).mobEffectTick(entity, effect, amplifier)) return true;
        return effect.applyEffectTick(entity, amplifier);
    }
}
