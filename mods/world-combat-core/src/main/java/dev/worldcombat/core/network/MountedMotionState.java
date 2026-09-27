package dev.worldcombat.core.network;

import dev.worldcombat.core.world.CombatServices;
import java.util.function.Consumer;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;

/** State changes only; native vehicle packets carry position and rotation. */
public record MountedMotionState(int entity,long serial,boolean active) implements CustomPacketPayload {
    public static Consumer<MountedMotionState> receiver=ignored -> {};
    public static final Type<MountedMotionState> TYPE=new Type<>(ResourceLocation.parse("world_combat_core:mounted_motion"));
    public static final StreamCodec<RegistryFriendlyByteBuf,MountedMotionState> CODEC=new StreamCodec<>() {
        public MountedMotionState decode(RegistryFriendlyByteBuf b) { return new MountedMotionState(b.readVarInt(),b.readVarLong(),b.readBoolean()); }
        public void encode(RegistryFriendlyByteBuf b,MountedMotionState s) { b.writeVarInt(s.entity); b.writeVarLong(s.serial); b.writeBoolean(s.active); }
    };
    public static void register(RegisterPayloadHandlersEvent event) {
        event.registrar("mounted_motion.1").playBidirectional(TYPE,CODEC,(packet,context) -> {
            if (context.player() instanceof ServerPlayer player) {
                var combat=CombatServices.existing(player.server);
                if (combat!=null && !packet.active) combat.mountedMotion().acknowledge(player,packet.entity,packet.serial);
            } else receiver.accept(packet);
        });
    }
    @Override public Type<MountedMotionState> type() { return TYPE; }
}
