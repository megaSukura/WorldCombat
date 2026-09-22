package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.cobblemon.mod.common.pokemon.Pokemon;
import dev.worldcombat.cobblemon.PokemonHealthBridge;
import net.minecraft.world.damagesource.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

@Mixin(value = PokemonEntity.class, remap = false)
public abstract class PokemonDamageMixin {
    /** Ownership does not bypass world combat. Native busy/beam checks and the player-damage config still apply. */
    @Redirect(method = "isInvulnerableTo", at = @At(value = "INVOKE",
            target = "Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;getOwnerUUID()Ljava/util/UUID;"))
    private java.util.UUID worldcombat$playerDamage(PokemonEntity entity, DamageSource source) {
        return source.getEntity() instanceof net.minecraft.world.entity.player.Player ? null : entity.getOwnerUUID();
    }

    @Redirect(method = "hurt", at = @At(value = "INVOKE",
            target = "Lcom/cobblemon/mod/common/pokemon/Pokemon;setCurrentHealth(I)V"))
    private void worldcombat$deferHealthWrite(Pokemon pokemon, int health) {
        // Commit once after the original accepted-hit path, for both wild and owned individuals.
    }

    @Inject(method = "hurt", at = @At("RETURN"))
    private void worldcombat$commitHealth(DamageSource source, float amount,
            CallbackInfoReturnable<Boolean> callback) {
        if (callback.getReturnValueZ()) {
            PokemonHealthBridge.afterDamage((PokemonEntity) (Object) this, source);
        }
    }
}
