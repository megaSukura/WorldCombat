package dev.worldcombat.cobblemon.network;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

/** Review tool state as JSON: the move list with statuses, the cursor and the last message. */
public record ReviewState(String json) implements CustomPacketPayload {
    public static final Type<ReviewState> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "review_state"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ReviewState> CODEC = new StreamCodec<>() {
        public ReviewState decode(RegistryFriendlyByteBuf buffer) { return new ReviewState(buffer.readUtf(262144)); }
        public void encode(RegistryFriendlyByteBuf buffer, ReviewState packet) { buffer.writeUtf(packet.json, 262144); }
    };
    @Override public Type<ReviewState> type() { return TYPE; }
}
