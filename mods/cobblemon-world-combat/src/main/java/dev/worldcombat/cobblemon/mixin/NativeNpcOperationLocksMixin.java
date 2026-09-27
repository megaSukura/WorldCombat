package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.battles.model.PokemonBattle;
import com.cobblemon.mod.common.api.battles.model.actor.BattleActor;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import kotlin.Pair;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** World challenges leave native items, riding and companion operations on their ordinary world paths. */
@Mixin(targets = "com.cobblemon.mod.common.util.PlayerExtensionsKt", remap = false)
public abstract class NativeNpcOperationLocksMixin {
    @Inject(method = "isInBattle", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$lock(ServerPlayer player, CallbackInfoReturnable<Boolean> callback) {
        if (NativeNpcChallenges.getBattleByPlayer(player.getUUID()) != null) callback.setReturnValue(false);
    }

    @Inject(method = "getBattleState", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$bag(ServerPlayer player, CallbackInfoReturnable<Pair<PokemonBattle, BattleActor>> callback) {
        if (NativeNpcChallenges.getBattleByPlayer(player.getUUID()) != null) callback.setReturnValue(null);
    }
}
