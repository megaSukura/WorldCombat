package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.pokemon.Pokemon;
import com.cobblemon.mod.common.pokemon.evolution.progress.DefeatEvolutionProgress;
import com.cobblemon.mod.common.pokemon.requirements.DefeatRequirement;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** The native codec normalizes property text, while its retention check compares the original spelling. */
@Mixin(value = DefeatEvolutionProgress.class, remap = false)
public abstract class DefeatProgressMixin {
    @Inject(method = "shouldKeep", at = @At("HEAD"))
    private void worldcombat$restoreRequirement(Pokemon pokemon, CallbackInfoReturnable<Boolean> callback) {
        var record = (DefeatEvolutionProgress) (Object) this;
        var progress = record.currentProgress();
        for (var evolution : pokemon.getForm().getEvolutions()) {
            for (var requirement : evolution.getRequirements()) {
                if (requirement instanceof DefeatRequirement defeat &&
                    defeat.getTarget().asString(" ").equalsIgnoreCase(progress.getTarget().asString(" "))) {
                    record.updateProgress(new DefeatEvolutionProgress.Progress(defeat.getTarget(), progress.getAmount()));
                    return;
                }
            }
        }
    }
}
