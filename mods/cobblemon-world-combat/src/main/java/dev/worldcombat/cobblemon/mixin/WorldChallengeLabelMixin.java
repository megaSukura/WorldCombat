package dev.worldcombat.cobblemon.mixin;

import com.cobblemon.mod.common.client.render.pokemon.PokemonRenderer;
import com.cobblemon.mod.common.api.storage.player.client.ClientGeneralPlayerData;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;

/** Keep native names and levels, while omitting the retired turn-battle prompt. */
@Mixin(value=PokemonRenderer.class,remap=false)
public abstract class WorldChallengeLabelMixin {
    @Redirect(method="renderNameTag(Lcom/cobblemon/mod/common/entity/pokemon/PokemonEntity;Lnet/minecraft/network/chat/Component;Lcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/MultiBufferSource;IF)V",
        at=@At(value="INVOKE",target="Lcom/cobblemon/mod/common/api/storage/player/client/ClientGeneralPlayerData;getShowChallengeLabel()Z"))
    private boolean worldcombat$hideChallenge(ClientGeneralPlayerData data){return false;}
}
