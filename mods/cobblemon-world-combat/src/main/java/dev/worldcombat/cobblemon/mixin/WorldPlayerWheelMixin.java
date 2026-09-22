package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.gui.interact.wheel.*;
import com.google.common.collect.*;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;

/** Trade and third-party interaction options remain in the native wheel. */
@Mixin(targets="com.cobblemon.mod.common.client.gui.interact.wheel.InteractWheelGuiFactoryKt",remap=false)
public abstract class WorldPlayerWheelMixin {
    @ModifyArg(method="createPlayerInteractGui",at=@At(value="INVOKE",target="Lcom/cobblemon/mod/common/client/gui/interact/wheel/InteractWheelGUI;<init>(Lcom/google/common/collect/Multimap;Lnet/minecraft/network/chat/Component;)V"),index=0)
    private static Multimap<Orientation,InteractWheelOption> worldcombat$options(Multimap<Orientation,InteractWheelOption> original){
        var result=ArrayListMultimap.create(original);
        result.values().removeIf(option->{var path=option.getIconResource().getPath();return path.endsWith("interact_wheel_icon_battle.png")||path.endsWith("interact_wheel_icon_spectate_battle.png");});return result;
    }
}
