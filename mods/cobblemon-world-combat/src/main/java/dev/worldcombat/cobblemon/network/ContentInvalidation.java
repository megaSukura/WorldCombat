package dev.worldcombat.cobblemon.network;

import java.util.UUID;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

/** A change notification carries identity only. Script channels decide which details to request. */
public record ContentInvalidation(UUID session, long epoch, String channel, UUID pokemon, long revision) implements CustomPacketPayload {
    public static final Type<ContentInvalidation> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "content_invalidation"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ContentInvalidation> CODEC = new StreamCodec<>() {
        public ContentInvalidation decode(RegistryFriendlyByteBuf buffer) {
            return new ContentInvalidation(buffer.readUUID(), buffer.readVarLong(), buffer.readUtf(128), buffer.readUUID(), buffer.readVarLong());
        }
        public void encode(RegistryFriendlyByteBuf buffer, ContentInvalidation packet) {
            buffer.writeUUID(packet.session); buffer.writeVarLong(packet.epoch); buffer.writeUtf(packet.channel, 128);
            buffer.writeUUID(packet.pokemon); buffer.writeVarLong(packet.revision);
        }
    };
    @Override public Type<ContentInvalidation> type() { return TYPE; }
}
