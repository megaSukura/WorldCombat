package dev.worldcombat.cobblemon.network;

import java.util.UUID;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

/** Correlation fields let clients discard replies from an obsolete connection or content epoch. */
public record ContentReply(UUID session, long sequence, long epoch, String channel,
                           UUID pokemon, String code, String data) implements CustomPacketPayload {
    public static final Type<ContentReply> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "content_reply"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ContentReply> CODEC = new StreamCodec<>() {
        public ContentReply decode(RegistryFriendlyByteBuf buffer) {
            return new ContentReply(buffer.readUUID(), buffer.readVarLong(), buffer.readVarLong(), buffer.readUtf(128),
                buffer.readUUID(), buffer.readUtf(64), dev.worldcombat.core.network.PacketJson.read(buffer));
        }
        public void encode(RegistryFriendlyByteBuf buffer, ContentReply packet) {
            buffer.writeUUID(packet.session); buffer.writeVarLong(packet.sequence); buffer.writeVarLong(packet.epoch);
            buffer.writeUtf(packet.channel, 128); buffer.writeUUID(packet.pokemon); buffer.writeUtf(packet.code, 64);
            dev.worldcombat.core.network.PacketJson.write(buffer, packet.data);
        }
    };
    @Override public Type<ContentReply> type() { return TYPE; }
}
