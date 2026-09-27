package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.CombatServices;
import net.minecraft.network.protocol.game.ServerboundMoveVehiclePacket;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.ServerGamePacketListenerImpl;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(ServerGamePacketListenerImpl.class)
abstract class MountedMotionPacketMixin {
    @Shadow public ServerPlayer player;
    @Inject(method="handleMoveVehicle",at=@At("HEAD"),cancellable=true)
    private void worldcombat$driverHandoff(ServerboundMoveVehiclePacket packet,CallbackInfo callback) {
        if (!player.server.isSameThread()) return; // Vanilla schedules the actual invocation onto the server thread.
        var combat=CombatServices.existing(player.server);
        if (combat!=null && combat.mountedMotion().blocksDriver(player)) callback.cancel();
    }
}
