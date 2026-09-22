package dev.worldcombat.cobblemon.network;

import java.util.UUID;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

/** Requests identify the native individual; world entities are optional. */
public record ContentRequest(UUID session, long sequence, long epoch, long observedTick,
                             String channel, UUID pokemon, String input) implements CustomPacketPayload {
    public static final Type<ContentRequest> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "content_request"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ContentRequest> CODEC = new StreamCodec<>() {
        public ContentRequest decode(RegistryFriendlyByteBuf buffer) {
            return new ContentRequest(buffer.readUUID(), buffer.readVarLong(), buffer.readVarLong(), buffer.readVarLong(),
                buffer.readUtf(128), buffer.readUUID(), dev.worldcombat.core.network.PacketJson.read(buffer));
        }
        public void encode(RegistryFriendlyByteBuf buffer, ContentRequest packet) {
            buffer.writeUUID(packet.session); buffer.writeVarLong(packet.sequence); buffer.writeVarLong(packet.epoch);
            buffer.writeVarLong(packet.observedTick); buffer.writeUtf(packet.channel, 128);
            buffer.writeUUID(packet.pokemon); dev.worldcombat.core.network.PacketJson.write(buffer, packet.input);
        }
    };
    @Override public Type<ContentRequest> type() { return TYPE; }
}
