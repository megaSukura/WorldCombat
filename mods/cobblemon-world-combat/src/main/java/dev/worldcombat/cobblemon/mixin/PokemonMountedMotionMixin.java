package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import dev.worldcombat.core.world.NativeMountedMotion;
import dev.worldcombat.core.world.NativeGroundLift;
import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.animal.ShoulderRidingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Authored motion uses native living-body physics while riders remain attached to the native seats. */
@Mixin(PokemonEntity.class)
abstract class PokemonMountedMotionMixin extends ShoulderRidingEntity {
    protected PokemonMountedMotionMixin(EntityType<? extends ShoulderRidingEntity> type,Level level) { super(type,level); }
    @Inject(method="tickRidden",at=@At("HEAD"),cancellable=true)
    private void worldcombat$pauseDriver(Player driver,Vec3 input,CallbackInfo callback) {
        if (NativeMountedMotion.active(this)) callback.cancel();
    }
    @Inject(method="travel",at=@At("HEAD"),cancellable=true)
    private void worldcombat$skillTravel(Vec3 input,CallbackInfo callback) {
        if (!NativeMountedMotion.active(this)) return;
        if (!level().isClientSide()) super.travel(input);
        callback.cancel();
    }
    @Inject(method="handleRelativeFrictionAndCalculateMovement",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodyFriction(Vec3 input,float friction,CallbackInfoReturnable<Vec3> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(super.handleRelativeFrictionAndCalculateMovement(input,friction));
    }
    @Inject(method="getRiddenInput",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodyInput(Player driver,Vec3 input,CallbackInfoReturnable<Vec3> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(input);
    }
    @Inject(method="getRiddenSpeed",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodySpeed(Player driver,CallbackInfoReturnable<Float> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(getSpeed());
    }
    @Inject(method="getDefaultGravity",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodyGravity(CallbackInfoReturnable<Double> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(super.getDefaultGravity());
    }
    @Inject(method="onGround",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodyGround(CallbackInfoReturnable<Boolean> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(super.onGround());
    }
    @Inject(method="isAffectedByFluids",at=@At("HEAD"),cancellable=true)
    private void worldcombat$bodyFluid(CallbackInfoReturnable<Boolean> result) {
        if (NativeMountedMotion.active(this)) result.setReturnValue(super.isAffectedByFluids());
    }
    @ModifyExpressionValue(method="travel",at=@At(value="INVOKE",target="Lnet/minecraft/world/phys/Vec3;add(Lnet/minecraft/world/phys/Vec3;)Lnet/minecraft/world/phys/Vec3;"))
    private Vec3 worldcombat$riderLift(Vec3 velocity) { return NativeGroundLift.riderVelocity(this,velocity); }
}
