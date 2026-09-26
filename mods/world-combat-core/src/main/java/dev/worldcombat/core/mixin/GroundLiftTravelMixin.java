package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import dev.worldcombat.core.world.NativeGroundLift;
import net.minecraft.world.entity.LivingEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

/** Assisted bodies retain ground input acceleration/damping while their real onGround flag stays false. */
@Mixin(LivingEntity.class)
abstract class GroundLiftTravelMixin {
    @ModifyExpressionValue(method = {"travel","getFrictionInfluencedSpeed"}, at = @At(value="INVOKE",target="Lnet/minecraft/world/entity/LivingEntity;onGround()Z"))
    private boolean worldcombat$supportedMotion(boolean grounded) { return grounded || NativeGroundLift.supported((LivingEntity)(Object)this); }
}
