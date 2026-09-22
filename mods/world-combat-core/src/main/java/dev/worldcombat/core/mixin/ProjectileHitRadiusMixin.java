package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.sugar.Local;
import dev.worldcombat.core.world.CombatProjectile;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.projectile.ProjectileUtil;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.ModifyArg;

/** Supplies content's collision margin to the existing native sweep. Other projectiles retain vanilla behavior. */
@Mixin(ProjectileUtil.class)
abstract class ProjectileHitRadiusMixin {
    @ModifyVariable(method = "getHitResult", at = @At("HEAD"), argsOnly = true)
    private static float worldcombat$radius(float original, @Local(argsOnly = true) Entity entity) {
        return entity instanceof CombatProjectile projectile ? projectile.hitRadius() : original;
    }
    @ModifyArg(method = "getHitResult", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/phys/AABB;inflate(D)Lnet/minecraft/world/phys/AABB;"), index = 0)
    private static double worldcombat$broadPhase(double original, @Local(argsOnly = true) Entity entity) {
        return entity instanceof CombatProjectile projectile ? Math.max(original, projectile.hitRadius()) : original;
    }
}
