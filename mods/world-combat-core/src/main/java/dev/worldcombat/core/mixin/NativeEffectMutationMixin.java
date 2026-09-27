package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import com.llamalad7.mixinextras.sugar.Local;
import dev.worldcombat.core.world.NativeEffectFacts;
import net.minecraft.core.Holder;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import java.util.Iterator;
import java.util.Map;

/** Observe native storage commits, including no-op accepted refreshes, cures and expiry. */
@Mixin(LivingEntity.class)
abstract class NativeEffectMutationMixin {
    @WrapOperation(method = {"addEffect(Lnet/minecraft/world/effect/MobEffectInstance;Lnet/minecraft/world/entity/Entity;)Z", "forceAddEffect"},
        at = @At(value = "INVOKE", target = "Ljava/util/Map;put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;"))
    private Object worldcombat$effectStored(Map<?, ?> map, Object key, Object value, Operation<Object> original) {
        var previous = original.call(map, key, value);
        NativeEffectFacts.added((LivingEntity) (Object) this, (MobEffectInstance) value, (MobEffectInstance) previous);
        return previous;
    }
    @WrapOperation(method = "addEffect(Lnet/minecraft/world/effect/MobEffectInstance;Lnet/minecraft/world/entity/Entity;)Z",
        at = @At(value = "INVOKE", target = "Lnet/minecraft/world/effect/MobEffectInstance;update(Lnet/minecraft/world/effect/MobEffectInstance;)Z"))
    private boolean worldcombat$effectMerged(MobEffectInstance installed, MobEffectInstance requested, Operation<Boolean> original) {
        boolean changed = original.call(installed, requested);
        // A permitted repeat application retires old resource ownership even when native merging keeps its values.
        NativeEffectFacts.added((LivingEntity) (Object) this, installed, installed);
        return changed;
    }
    @WrapMethod(method = "removeEffectNoUpdate")
    private MobEffectInstance worldcombat$effectRemoved(Holder<MobEffect> type, Operation<MobEffectInstance> original) {
        var removed = original.call(type);
        NativeEffectFacts.removed((LivingEntity) (Object) this, removed, "removed");
        return removed;
    }
    @WrapOperation(method = {"removeAllEffects", "removeEffectsCuredBy"},
        at = @At(value = "INVOKE", target = "Ljava/util/Iterator;remove()V"))
    private void worldcombat$effectsCleared(Iterator<?> iterator, Operation<Void> original, @Local MobEffectInstance effect) {
        original.call(iterator);
        NativeEffectFacts.removed((LivingEntity) (Object) this, effect, "removed");
    }
    @WrapOperation(method = "tickEffects", at = @At(value = "INVOKE", target = "Ljava/util/Iterator;remove()V"))
    private void worldcombat$effectExpired(Iterator<?> iterator, Operation<Void> original, @Local MobEffectInstance effect) {
        original.call(iterator);
        NativeEffectFacts.removed((LivingEntity) (Object) this, effect, "expired");
    }
}
