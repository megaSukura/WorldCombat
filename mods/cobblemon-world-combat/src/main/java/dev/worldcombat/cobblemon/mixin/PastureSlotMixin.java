package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.gui.pasture.PasturePokemonScrollList;
import dev.worldcombat.cobblemon.client.CompanionContentClient;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** The existing recall/conflict buttons keep priority. Clicking the remaining slot opens world commands. */
@Mixin(PasturePokemonScrollList.PastureSlot.class)
public abstract class PastureSlotMixin {
    @Inject(method = "mouseClicked", at = @At("RETURN"), cancellable = true)
    private void worldcombat$commands(double x, double y, int button, CallbackInfoReturnable<Boolean> ci) {
        var slot = (PasturePokemonScrollList.PastureSlot) (Object) this;
        if (!ci.getReturnValue() && button == 0 && slot.isOwned() && slot.getPokemon().getEntityKnown()) {
            CompanionContentClient.openResident(slot.getPokemon().getPokemonId(), "command-click");
            ci.setReturnValue(true);
        }
    }
    @Inject(method = "render", at = @At("TAIL"))
    private void worldcombat$hint(GuiGraphics graphics, int index, int top, int left, int width, int height,
        int mouseX, int mouseY, boolean hovered, float partial, CallbackInfo ci) {
        var slot = (PasturePokemonScrollList.PastureSlot) (Object) this;
        if (hovered && slot.isOwned() && slot.getPokemon().getEntityKnown())
            graphics.renderTooltip(Minecraft.getInstance().font, Component.translatable("worldcombat.pasture.open_commands"), mouseX, mouseY);
    }
}
