package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.api.battles.model.PokemonBattle;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

@Mixin(targets = "com.cobblemon.mod.common.api.storage.party.PlayerPartyStore", remap = false)
public abstract class NativeNpcPartyTickMixin {
    @Redirect(method = "onSecondPassed", at = @At(value = "INVOKE", target = "Lcom/cobblemon/mod/common/battles/BattleRegistry;getBattleByParticipatingPlayer(Lnet/minecraft/server/level/ServerPlayer;)Lcom/cobblemon/mod/common/api/battles/model/PokemonBattle;"))
    private PokemonBattle worldcombat$worldParty(ServerPlayer player) {
        return NativeNpcChallenges.operationBattle(player);
    }
}
