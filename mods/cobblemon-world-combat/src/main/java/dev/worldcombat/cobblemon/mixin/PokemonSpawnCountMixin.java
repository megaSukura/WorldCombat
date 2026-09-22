package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import net.minecraft.world.entity.MobCategory;
import org.spongepowered.asm.mixin.Mixin;

/** Cobblemon owns its population budget; NeoForge's vanilla census remains available to other animals. */
@Mixin(PokemonEntity.class)
public abstract class PokemonSpawnCountMixin {
    // Overrides IEntityExtension's inherited default, only for NaturalSpawner's population census.
    public MobCategory getClassification(boolean forSpawnCount) {
        return forSpawnCount ? MobCategory.MISC : ((PokemonEntity) (Object) this).getType().getCategory();
    }
}
