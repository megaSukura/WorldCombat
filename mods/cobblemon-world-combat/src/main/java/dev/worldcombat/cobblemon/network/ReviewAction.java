package dev.worldcombat.cobblemon.network;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

/** Review tool: the client asks for something (`{"op":...}` JSON) and the server answers with a fresh {@link ReviewState}. */
public record ReviewAction(String json) implements CustomPacketPayload {
    public static final Type<ReviewAction> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "review_action"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ReviewAction> CODEC = new StreamCodec<>() {
        public ReviewAction decode(RegistryFriendlyByteBuf buffer) { return new ReviewAction(buffer.readUtf(262144)); }
        public void encode(RegistryFriendlyByteBuf buffer, ReviewAction packet) { buffer.writeUtf(packet.json, 262144); }
    };
    @Override public Type<ReviewAction> type() { return TYPE; }
}
