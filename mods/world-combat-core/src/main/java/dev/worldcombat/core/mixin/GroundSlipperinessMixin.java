package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import dev.worldcombat.core.world.PublicAttributes;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

/** Native travel retains its input, damping and collisions; a synced body attribute adjusts its terrain coefficient. */
@Mixin(LivingEntity.class)
abstract class GroundSlipperinessMixin {
    @ModifyExpressionValue(method = "travel", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/block/state/BlockState;getFriction(Lnet/minecraft/world/level/LevelReader;Lnet/minecraft/core/BlockPos;Lnet/minecraft/world/entity/Entity;)F"))
    private float worldcombat$slipperiness(float terrain) {
        var entity = (LivingEntity) (Object) this;
        var attribute = entity.getAttribute(PublicAttributes.GROUND_SLIPPERINESS);
        return attribute == null ? terrain : (float) Math.max(terrain, attribute.getValue());
    }
}
