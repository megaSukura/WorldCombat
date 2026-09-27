package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Optional resource-owned carriers leave with their runtime scope; ordinary native effects keep native persistence. */
@Mixin(LivingEntity.class)
public abstract class MobEffectLeaseSaveMixin {
    @Inject(method = "addAdditionalSaveData", at = @At("TAIL"))
    private void worldcombat$leasedEffects(CompoundTag data, CallbackInfo callback) {
        var entity = (LivingEntity) (Object) this;
        if (entity.level() instanceof ServerLevel level) {
            var combat = CombatServices.existing(level.getServer());
            if (combat != null) combat.savingMobEffects(entity, data);
        }
    }
}
