package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.gui.summary.widgets.screens.moves.MoveSwapScreen;
import dev.worldcombat.cobblemon.client.SummaryContentBridge;
import net.minecraft.client.gui.GuiGraphics;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(MoveSwapScreen.MoveSlot.class)
public abstract class SummaryMoveSwapMixin {
    @Inject(method = "render", at = @At("TAIL"))
    private void worldcombat$rules(GuiGraphics graphics, int index, int rowTop, int rowLeft, int rowWidth,
                                  int rowHeight, int mouseX, int mouseY, boolean hovered, float partialTicks, CallbackInfo ci) {
        var slot = (MoveSwapScreen.MoveSlot) (Object) this;
        var move = slot.getMove();
        var pokemon = ((SummaryPokemonAccess) (Object) slot.getPane().getMovesWidget().getSummary()).worldcombat$selectedPokemon();
        if (move != null && SummaryContentBridge.active(pokemon)) {
            int pp = move.getPp() + slot.getPpRaisedStages() * move.getPp() / 5;
            var region = SummaryContentBridge.region("learnset", pokemon, move.getName(), pp, pp,
                rowLeft + 9, rowTop + 10, 66, 8, mouseX, mouseY, -1, graphics);
            SummaryContentBridge.render(region);
            if (hovered) SummaryContentBridge.focus(region, rowLeft - 9, rowTop, rowWidth + 9, 18);
        }
    }
}
