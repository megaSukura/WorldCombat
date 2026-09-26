package dev.worldcombat.core.mixin;

import dev.worldcombat.core.runtime.Point;
import dev.worldcombat.core.world.NativePathGoal;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.pathfinder.Path;
import net.minecraft.world.phys.Vec3;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(Path.class)
abstract class NativePathGoalMixin implements NativePathGoal {
    @Unique private Point worldcombat$goal;
    @Unique private double worldcombat$within;
    @Override public Point worldcombat$goal() { return worldcombat$goal; }
    @Override public double worldcombat$within() { return worldcombat$within; }
    @Override public void worldcombat$goal(Point goal, double within) { worldcombat$goal = goal; worldcombat$within = within; }
    @Inject(method = "getEntityPosAtNode", at = @At("RETURN"), cancellable = true)
    private void worldcombat$finalPoint(Entity body, int index, CallbackInfoReturnable<Vec3> result) {
        if (worldcombat$goal != null && index == ((Path) (Object) this).getNodeCount() - 1)
            result.setReturnValue(worldcombat$feet(body));
    }
}
