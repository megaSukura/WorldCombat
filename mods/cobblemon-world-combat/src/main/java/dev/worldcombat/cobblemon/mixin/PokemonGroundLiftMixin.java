package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.ai.OmniPathNavigation;
import dev.worldcombat.core.world.NativeGroundLift;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.navigation.GroundPathNavigation;
import net.minecraft.world.level.Level;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value=OmniPathNavigation.class,remap=false)
abstract class PokemonGroundLiftMixin extends GroundPathNavigation {
    protected PokemonGroundLiftMixin(Mob mob, Level level) { super(mob,level); }
    @Inject(method="canUpdatePath",at=@At("HEAD"),cancellable=true)
    private void worldcombat$supportedPath(CallbackInfoReturnable<Boolean> result) { if (NativeGroundLift.supported(mob)) result.setReturnValue(true); }
}
