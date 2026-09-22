package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.storage.party.PlayerPartyStore;
import com.cobblemon.mod.common.pokemon.Pokemon;
import com.cobblemon.mod.common.pokemon.status.PersistentStatus;
import dev.worldcombat.cobblemon.script.NativeMechanics;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/** Hand the native periodic callback to its active world execution lease. Native timers and storage remain native. */
@Mixin(value = PlayerPartyStore.class, remap = false)
public abstract class NativeStatusMixin {
    @Redirect(method = "onSecondPassed", at = @At(value = "INVOKE", target = "Lcom/cobblemon/mod/common/pokemon/status/PersistentStatus;onSecondPassed(Lnet/minecraft/server/level/ServerPlayer;Lcom/cobblemon/mod/common/pokemon/Pokemon;Lkotlin/random/Random;)V"))
    private void worldcombat$statusTick(PersistentStatus status, ServerPlayer player, Pokemon pokemon, kotlin.random.Random random) {
        if (!NativeMechanics.managesStatus(pokemon)) status.onSecondPassed(player, pokemon, random);
    }
}
