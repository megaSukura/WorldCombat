package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.battles.BattleBuilder;
import com.cobblemon.mod.common.battles.BattleFormat;
import com.cobblemon.mod.common.battles.BattleStartResult;
import com.cobblemon.mod.common.api.storage.party.PartyStore;
import com.cobblemon.mod.common.entity.npc.NPCEntity;
import dev.worldcombat.cobblemon.NativeNpcChallenges;
import net.minecraft.server.level.ServerPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import java.util.UUID;

@Mixin(value = BattleBuilder.class, remap = false)
public abstract class NativeNpcPreflightMixin {
    @Inject(method = "pvn(Lnet/minecraft/server/level/ServerPlayer;Lcom/cobblemon/mod/common/entity/npc/NPCEntity;Ljava/util/UUID;Lcom/cobblemon/mod/common/battles/BattleFormat;ZZLcom/cobblemon/mod/common/api/storage/party/PartyStore;)Lcom/cobblemon/mod/common/battles/BattleStartResult;",
        at = @At("HEAD"), cancellable = true)
    private void worldcombat$validate(ServerPlayer player, NPCEntity npc, UUID leading, BattleFormat format,
                                     boolean clone, boolean heal, PartyStore party,
                                     CallbackInfoReturnable<BattleStartResult> callback) {
        var refusal = NativeNpcChallenges.preflight(player, npc, format, clone);
        if (refusal != null) callback.setReturnValue(refusal);
    }
}
