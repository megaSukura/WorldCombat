package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.gui.summary.widgets.screens.moves.MovesWidget;
import dev.worldcombat.cobblemon.client.SummaryContentBridge;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(MovesWidget.class)
public abstract class SummaryMovesMixin {
    @Unique private SummaryContentBridge.Region worldcombat$region(GuiGraphics graphics, double mouseX, double mouseY, int button) {
        var widget = (MovesWidget) (Object) this;
        var pokemon = ((SummaryPokemonAccess) (Object) widget.getSummary()).worldcombat$selectedPokemon();
        if (!SummaryContentBridge.active(pokemon)) return null;
        var move = widget.getSelectedMove();
        return SummaryContentBridge.region("details", pokemon, move == null ? "" : move.getName(),
            move == null ? 0 : move.getCurrentPp(), move == null ? 0 : move.getMaxPp(),
            widget.getX(), widget.getY() + 109, 134, 39, mouseX, mouseY, button, graphics);
    }

    @Inject(method = "renderWidget", at = @At("TAIL"))
    private void worldcombat$details(GuiGraphics graphics, int mouseX, int mouseY, float partialTicks, CallbackInfo ci) {
        var region = worldcombat$region(graphics, mouseX, mouseY, -1);
        if (region != null) {
            SummaryContentBridge.render(region);
            SummaryContentBridge.focus(region, region.x(), region.y(), region.width(), region.height());
        }
    }

    @Inject(method = "mouseClicked", at = @At("HEAD"), cancellable = true)
    private void worldcombat$click(double mouseX, double mouseY, int button, CallbackInfoReturnable<Boolean> cir) {
        var region = worldcombat$region(null, mouseX, mouseY, button);
        if (worldcombat$inside(region, mouseX, mouseY)) {
            SummaryContentBridge.click(region);
            cir.setReturnValue(true);
        }
    }

    @Inject(method = "mouseScrolled", at = @At("HEAD"), cancellable = true)
    private void worldcombat$scroll(double mouseX, double mouseY, double horizontal, double vertical, CallbackInfoReturnable<Boolean> cir) {
        if (worldcombat$inside(worldcombat$region(null, mouseX, mouseY, -1), mouseX, mouseY)) cir.setReturnValue(true);
    }

    @Inject(method = "mouseDragged", at = @At("HEAD"), cancellable = true)
    private void worldcombat$drag(double mouseX, double mouseY, int button, double dx, double dy, CallbackInfoReturnable<Boolean> cir) {
        if (worldcombat$inside(worldcombat$region(null, mouseX, mouseY, button), mouseX, mouseY)) cir.setReturnValue(true);
    }

    @Unique private static boolean worldcombat$inside(SummaryContentBridge.Region region, double x, double y) {
        return region != null && x >= region.x() && x < region.x() + region.width()
            && y >= region.y() && y < region.y() + region.height();
    }
}
