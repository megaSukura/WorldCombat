package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import com.llamalad7.mixinextras.injector.wrapoperation.WrapOperation;
import dev.worldcombat.core.world.CombatProjectile;
import net.minecraft.world.entity.projectile.ThrowableProjectile;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;

/** Native sweep/deflection chooses this velocity before the optional motion law; gravity remains native. */
@Mixin(ThrowableProjectile.class)
public abstract class ProjectileMotionMixin {
    @WrapOperation(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/phys/Vec3;scale(D)Lnet/minecraft/world/phys/Vec3;"))
    private Vec3 worldcombat$motion(Vec3 velocity, double nativeDrag, Operation<Vec3> original) {
        if ((Object) this instanceof CombatProjectile projectile)
            return original.call(projectile.acceleratedVelocity(velocity), projectile.velocityRetention(nativeDrag));
        return original.call(velocity, nativeDrag);
    }
}
