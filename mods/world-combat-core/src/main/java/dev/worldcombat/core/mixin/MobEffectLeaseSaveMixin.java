package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import dev.worldcombat.core.world.MinecraftEffectState;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.effect.MobEffectInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Optional resource-owned carriers leave with their runtime scope; ordinary native effects keep native persistence. */
@Mixin(LivingEntity.class)
public abstract class MobEffectLeaseSaveMixin {
    /** forceAddEffect bypasses NeoForge Added and can even replay the very same native object. */
    @Inject(method = "forceAddEffect", at = @At("TAIL"))
    private void worldcombat$forcedEffect(MobEffectInstance requested, Entity source, CallbackInfo callback) {
        var entity = (LivingEntity) (Object) this;
        if (entity.level() instanceof ServerLevel level && entity.getEffect(requested.getEffect()) == requested) {
            var combat = CombatServices.existing(level.getServer());
            if (combat == null) MinecraftEffectState.applied(entity, requested);
            else combat.mobEffectReapplied(entity, requested);
        }
    }
    @Inject(method = "addAdditionalSaveData", at = @At("TAIL"))
    private void worldcombat$leasedEffects(CompoundTag data, CallbackInfo callback) {
        var entity = (LivingEntity) (Object) this;
        if (entity.level() instanceof ServerLevel level) {
            var combat = CombatServices.existing(level.getServer());
            if (combat != null) combat.savingMobEffects(entity, data);
        }
    }
}
