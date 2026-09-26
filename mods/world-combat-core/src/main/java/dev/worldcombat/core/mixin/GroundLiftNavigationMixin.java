package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeGroundLift;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.navigation.*;
import net.minecraft.world.level.Level;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(GroundPathNavigation.class)
abstract class GroundLiftNavigationMixin extends PathNavigation {
    protected GroundLiftNavigationMixin(Mob mob, Level level) { super(mob,level); }
    @Inject(method="canUpdatePath",at=@At("HEAD"),cancellable=true)
    private void worldcombat$groundSupport(CallbackInfoReturnable<Boolean> result) { if (NativeGroundLift.supported(mob)) result.setReturnValue(true); }
}
