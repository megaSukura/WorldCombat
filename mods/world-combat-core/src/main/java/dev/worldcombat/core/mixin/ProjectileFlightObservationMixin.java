package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.entity.projectile.ProjectileDeflection;
import net.minecraft.world.phys.HitResult;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Records the accepted native contact before its damage callback; canceled impact events never reach here. */
@Mixin(Projectile.class)
abstract class ProjectileFlightObservationMixin {
    @Inject(method = "hitTargetOrDeflectSelf", at = @At("HEAD"))
    private void worldcombat$processedFlight(HitResult hit, CallbackInfoReturnable<ProjectileDeflection> callback) {
        var projectile = (Projectile) (Object) this;
        if (projectile.level() instanceof ServerLevel level)
            CombatServices.get(level.getServer()).projectileObservations().impact(projectile, hit);
    }
}
