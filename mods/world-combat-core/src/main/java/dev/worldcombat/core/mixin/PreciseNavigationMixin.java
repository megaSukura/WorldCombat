package dev.worldcombat.core.mixin;

import com.llamalad7.mixinextras.injector.ModifyExpressionValue;
import dev.worldcombat.core.world.NativePathGoal;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.level.pathfinder.Path;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Native routes keep their middle nodes, low-level controls, collision and stuck handling. */
@Mixin(PathNavigation.class)
abstract class PreciseNavigationMixin {
    @Shadow @Final protected Mob mob;
    @Shadow protected Path path;
    @Shadow protected abstract void followThePath();
    @Shadow protected abstract Vec3 getTempMobPos();
    @Shadow protected abstract void doStuckDetection(Vec3 position);

    @Redirect(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/ai/navigation/PathNavigation;followThePath()V"))
    private void worldcombat$followFinalPoint(PathNavigation navigation) {
        var goal = NativePathGoal.finalGoal(path);
        if (goal == null) { followThePath(); return; }
        if (!goal.worldcombat$arrived(mob)) { doStuckDetection(getTempMobPos()); return; }
        followThePath();
    }

    @ModifyExpressionValue(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/pathfinder/Path;getNextEntityPos(Lnet/minecraft/world/entity/Entity;)Lnet/minecraft/world/phys/Vec3;"))
    private Vec3 worldcombat$finalFeet(Vec3 nativePoint) {
        var goal = NativePathGoal.finalGoal(path);
        return goal == null ? nativePoint : goal.worldcombat$feet(mob);
    }

    @Redirect(method = "tick", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/pathfinder/Path;advance()V"))
    private void worldcombat$fallingFinalPoint(Path route) {
        var goal = NativePathGoal.finalGoal(route);
        if (goal == null || goal.worldcombat$arrived(mob)) route.advance();
    }
}
