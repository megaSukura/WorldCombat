package dev.worldcombat.core.mixin;

import dev.worldcombat.core.world.NativeMountedMotion;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientPacketListener;
import net.minecraft.network.protocol.game.ClientboundMoveVehiclePacket;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** Accept server movement during the handoff without echoing stale driving packets back. */
@Mixin(ClientPacketListener.class)
abstract class MountedMotionClientPacketMixin {
    @Inject(method="handleMoveVehicle",at=@At("HEAD"),cancellable=true)
    private void worldcombat$authoritativeVehicle(ClientboundMoveVehiclePacket packet,CallbackInfo callback) {
        var client=Minecraft.getInstance();
        if (!client.isSameThread() || client.player==null) return;
        var vehicle=client.player.getRootVehicle();
        if (vehicle==client.player || !NativeMountedMotion.active(vehicle)) return;
        vehicle.absMoveTo(packet.getX(),packet.getY(),packet.getZ(),packet.getYRot(),packet.getXRot());
        for (var passenger:vehicle.getPassengers()) vehicle.positionRider(passenger);
        callback.cancel();
    }
}
