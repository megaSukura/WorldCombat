package dev.worldcombat.core.network;

import java.util.function.Consumer;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;

/** Change-driven scene update; native NeoForge transport handles packet fragmentation. */
public record SceneState(long epoch, long tick, String dimension, long revision, String data) implements CustomPacketPayload {
    public static Consumer<SceneState> receiver = ignored -> {};
    public static final Type<SceneState> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("world_combat_core", "scene"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SceneState> CODEC = new StreamCodec<>() {
        public SceneState decode(RegistryFriendlyByteBuf b) { return new SceneState(b.readVarLong(), b.readVarLong(), b.readUtf(), b.readVarLong(), PacketJson.read(b)); }
        public void encode(RegistryFriendlyByteBuf b, SceneState s) { b.writeVarLong(s.epoch); b.writeVarLong(s.tick); b.writeUtf(s.dimension); b.writeVarLong(s.revision); PacketJson.write(b, s.data); }
    };
    public static void register(RegisterPayloadHandlersEvent event) {
        event.registrar("p5.native-scenes.1").playToClient(TYPE, CODEC, (packet, context) -> receiver.accept(packet));
    }
    @Override public Type<SceneState> type() { return TYPE; }
}
