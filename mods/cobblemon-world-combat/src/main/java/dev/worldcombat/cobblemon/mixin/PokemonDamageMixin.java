package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.entity.pokemon.PokemonEntity;
import com.cobblemon.mod.common.pokemon.Pokemon;
import dev.worldcombat.cobblemon.PokemonHealthBridge;
import com.llamalad7.mixinextras.injector.wrapmethod.WrapMethod;
import com.llamalad7.mixinextras.injector.wrapoperation.Operation;
import dev.worldcombat.core.world.NativeDamageReceipts;
import net.minecraft.world.damagesource.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

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

    @WrapMethod(method = "hurt")
    private boolean worldcombat$commitHealth(DamageSource source, float amount, Operation<Boolean> original) {
        var entity = (PokemonEntity) (Object) this;
        if (entity.level().isClientSide) return original.call(source, amount);
        try (var receipt = NativeDamageReceipts.enter(entity, source, amount, PokemonEntity.class)) {
            boolean accepted = original.call(source, receipt.amount(amount));
            if (accepted) PokemonHealthBridge.afterDamage(entity, source);
            return receipt.returned(accepted);
        }
    }
}
