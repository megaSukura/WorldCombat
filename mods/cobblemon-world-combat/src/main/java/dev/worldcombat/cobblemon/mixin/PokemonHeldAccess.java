package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.pokemon.Pokemon;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/** Paired native transactions publish both pre-events before changing either stored stack. */
@Mixin(value = Pokemon.class, remap = false)
public interface PokemonHeldAccess {
    @Accessor("heldItem") void worldcombat$heldItem(ItemStack stack);
    @Accessor("canDropHeldItem") boolean worldcombat$canDropHeldItem();
    @Accessor("canDropHeldItem") void worldcombat$canDropHeldItem(boolean value);
}
