package dev.worldcombat.cobblemon.mixin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.*;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
@Mixin(targets="com.cobblemon.mod.common.net.serverhandling.ChallengeHandler",remap=false)
public abstract class WorldChallengePacketMixin {
    @Inject(method="handle(Lcom/cobblemon/mod/common/net/messages/server/BattleChallengePacket;Lnet/minecraft/server/MinecraftServer;Lnet/minecraft/server/level/ServerPlayer;)V",at=@At("HEAD"),cancellable=true)
    private void worldcombat$obsolete(CallbackInfo ci){ci.cancel();}
}
