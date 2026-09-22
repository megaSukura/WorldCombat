package dev.worldcombat.cobblemon.network;

import dev.worldcombat.core.runtime.Point;
import java.util.UUID;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record ControlCommand(UUID session, long sequence, long epoch, long observedTick, UUID actor,
                             long generation, int partySlot, String operation, int value,
                             UUID target, Point point, Point direction, String version, String input) implements CustomPacketPayload {
    public ControlCommand(UUID session, long sequence, long epoch, long observedTick, UUID actor, long generation, int partySlot,
                          String operation, int value, UUID target, Point point, Point direction, String version) {
        this(session, sequence, epoch, observedTick, actor, generation, partySlot, operation, value, target, point, direction, version, "{}");
    }
    public static final UUID NONE = new UUID(0, 0);
    public static final Type<ControlCommand> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "command"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ControlCommand> CODEC = new StreamCodec<>() {
        public ControlCommand decode(RegistryFriendlyByteBuf b) {
            return new ControlCommand(b.readUUID(), b.readVarLong(), b.readVarLong(), b.readVarLong(), b.readUUID(),
                b.readVarLong(), b.readVarInt(), b.readUtf(24), b.readVarInt(), b.readUUID(), readPoint(b), readPoint(b), b.readUtf(384), dev.worldcombat.core.network.PacketJson.read(b));
        }
        public void encode(RegistryFriendlyByteBuf b, ControlCommand c) {
            b.writeUUID(c.session); b.writeVarLong(c.sequence); b.writeVarLong(c.epoch); b.writeVarLong(c.observedTick);
            b.writeUUID(c.actor); b.writeVarLong(c.generation); b.writeVarInt(c.partySlot); b.writeUtf(c.operation, 24);
            b.writeVarInt(c.value); b.writeUUID(c.target); writePoint(b, c.point); writePoint(b, c.direction); b.writeUtf(c.version, 384);
            dev.worldcombat.core.network.PacketJson.write(b, c.input);
        }
    };
    static Point readPoint(RegistryFriendlyByteBuf b) { return new Point(b.readDouble(), b.readDouble(), b.readDouble()); }
    static void writePoint(RegistryFriendlyByteBuf b, Point p) { b.writeDouble(p.x()); b.writeDouble(p.y()); b.writeDouble(p.z()); }
    @Override public Type<ControlCommand> type() { return TYPE; }
}
