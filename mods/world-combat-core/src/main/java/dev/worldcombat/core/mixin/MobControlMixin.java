package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.goal.GoalSelector;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Lease high-level native decisions while preserving navigation, physical motion and low-level controls. */
@Mixin(Mob.class)
public abstract class MobControlMixin {
    @Shadow protected abstract void customServerAiStep();
    private boolean worldcombat$managed() {
        var mob = (Mob) (Object) this;
        return mob.level() instanceof ServerLevel level && CombatServices.get(level.getServer()).controls(mob);
    }
    @Redirect(method = "serverAiStep", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/ai/goal/GoalSelector;tick()V"))
    private void worldcombat$goals(GoalSelector selector) {
        if (worldcombat$managed()) selector.getAvailableGoals().forEach(net.minecraft.world.entity.ai.goal.WrappedGoal::stop);
        else selector.tick();
    }
    @Redirect(method = "serverAiStep", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/ai/goal/GoalSelector;tickRunningGoals(Z)V"))
    private void worldcombat$runningGoals(GoalSelector selector, boolean all) {
        if (worldcombat$managed()) selector.getAvailableGoals().forEach(net.minecraft.world.entity.ai.goal.WrappedGoal::stop);
        else selector.tickRunningGoals(all);
    }
    @Redirect(method = "serverAiStep", at = @At(value = "INVOKE", target = "Lnet/minecraft/world/entity/Mob;customServerAiStep()V"))
    private void worldcombat$nativeBrain(Mob mob) { if (!worldcombat$managed()) customServerAiStep(); }
}
