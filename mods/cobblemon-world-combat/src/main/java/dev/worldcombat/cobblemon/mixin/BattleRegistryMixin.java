package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.battles.BattleRegistry;
import com.cobblemon.mod.common.battles.BattleStartResult;
import com.cobblemon.mod.common.battles.BattleFormat;
import com.cobblemon.mod.common.battles.BattleSide;
import com.cobblemon.mod.common.api.battles.model.PokemonBattle;
import dev.worldcombat.cobblemon.LegacyBattleGate;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import net.minecraft.server.level.ServerPlayer;
import java.util.UUID;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(value = BattleRegistry.class, remap = false)
public abstract class BattleRegistryMixin {
    @Inject(method = "startBattle", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$reject(BattleFormat format, BattleSide first, BattleSide second, boolean canPreempt,
                                          CallbackInfoReturnable<BattleStartResult> callback) {
        var challenge = NativeNpcChallenges.start(format, first, second, canPreempt);
        callback.setReturnValue(challenge != null ? challenge : LegacyBattleGate.reject());
    }

    @Inject(method = "getBattle", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$lookup(UUID id, CallbackInfoReturnable<PokemonBattle> callback) {
        var battle = NativeNpcChallenges.getBattle(id);
        if (battle != null) callback.setReturnValue(battle);
    }

    @Inject(method = "getBattleByParticipatingPlayer", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$player(ServerPlayer player, CallbackInfoReturnable<PokemonBattle> callback) {
        var battle = NativeNpcChallenges.getBattleByPlayer(player.getUUID());
        if (battle != null) callback.setReturnValue(battle);
    }

    @Inject(method = "getBattleByParticipatingPlayerId", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$playerId(UUID id, CallbackInfoReturnable<PokemonBattle> callback) {
        var battle = NativeNpcChallenges.getBattleByPlayer(id);
        if (battle != null) callback.setReturnValue(battle);
    }

    @Inject(method = "closeBattle", at = @At("HEAD"), cancellable = true)
    private static void worldcombat$close(PokemonBattle battle, CallbackInfo callback) {
        if (NativeNpcChallenges.endNative(battle, "native-close")) callback.cancel();
    }
}
