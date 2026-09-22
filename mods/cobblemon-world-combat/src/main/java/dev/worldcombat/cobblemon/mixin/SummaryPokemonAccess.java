package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.gui.summary.Summary;
import com.cobblemon.mod.common.pokemon.Pokemon;
import net.minecraft.client.gui.components.AbstractWidget;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(Summary.class)
public interface SummaryPokemonAccess {
    @Accessor(value = "selectedPokemon", remap = false)
    Pokemon worldcombat$selectedPokemon();
    @Accessor(value = "mainScreen", remap = false)
    AbstractWidget worldcombat$mainScreen();
}
