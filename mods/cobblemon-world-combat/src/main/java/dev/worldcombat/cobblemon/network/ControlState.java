package dev.worldcombat.cobblemon.network;

import java.util.List;
import java.util.ArrayList;
import java.util.UUID;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import dev.worldcombat.core.runtime.ActionPreview;

public record ControlState(UUID session, long sequence, long epoch, long tick, UUID actor, long generation,
                           int entityId, int partySlot, String name, String stage, String reason,
                           String intent, String tactics, int permissions, int chaseRange, UUID protectedTarget,
                            List<Skill> skills, List<Member> members, String references, long inputToken) implements CustomPacketPayload {
    public record Member(int slot, String name, String intent, String stage) {}
    public record Skill(String id, String version, String kind, double range, int cooldown, boolean available,
                        String label, int remaining, int maximum, String reason, ActionPreview preview) {}
    /** Cooldowns advance locally; neither an unchanged HUD nor its countdown needs repeated full packets. */
    public ControlState atTick(long now) {
        return atTick(now, sequence);
    }
    public ControlState atTick(long now, long acknowledged) {
        long elapsed = Math.max(0, now - tick);
        var projected = skills.stream().map(s -> new Skill(s.id, s.version, s.kind, s.range,
            (int) Math.max(0, s.cooldown - elapsed), s.available, s.label, s.remaining, s.maximum, s.reason, s.preview)).toList();
        return new ControlState(session, acknowledged, epoch, now, actor, generation, entityId, partySlot, name, stage, reason,
            intent, tactics, permissions, chaseRange, protectedTarget, projected, members, references, inputToken);
    }
    public static final Type<ControlState> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath("cobblemon_world_combat", "state"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ControlState> CODEC = new StreamCodec<>() {
        public ControlState decode(RegistryFriendlyByteBuf b) {
            UUID session = b.readUUID(); long sequence = b.readVarLong(), epoch = b.readVarLong(), tick = b.readVarLong();
            UUID actor = b.readUUID(); long generation = b.readVarLong(); int entity = b.readVarInt(), party = b.readVarInt();
            String name = b.readUtf(128), stage = b.readUtf(32), reason = b.readUtf(64), intent = b.readUtf(24), tactics = b.readUtf(24);
            int mask = b.readVarInt(), range = b.readVarInt();
            UUID protectedTarget = b.readUUID();
            List<Skill> skills = new ArrayList<>();
            for (int i = 0; i < 4; i++) skills.add(new Skill(b.readUtf(128), b.readUtf(384), b.readUtf(24),
                b.readDouble(), b.readVarInt(), b.readBoolean(), b.readUtf(128), b.readVarInt(), b.readVarInt(), b.readUtf(64), ActionPreview.parse(dev.worldcombat.core.network.PacketJson.read(b))));
            int count = b.readVarInt(); if (count < 0 || count > 6) throw new IllegalArgumentException("Invalid roster");
            var members = new ArrayList<Member>();
            for (int i = 0; i < count; i++) members.add(new Member(b.readVarInt(), b.readUtf(128), b.readUtf(24), b.readUtf(32)));
            return new ControlState(session, sequence, epoch, tick, actor, generation, entity, party, name, stage, reason,
                intent, tactics, mask, range, protectedTarget, List.copyOf(skills), List.copyOf(members), dev.worldcombat.core.network.PacketJson.read(b), b.readVarLong());
        }
        public void encode(RegistryFriendlyByteBuf b, ControlState c) {
            b.writeUUID(c.session); b.writeVarLong(c.sequence); b.writeVarLong(c.epoch); b.writeVarLong(c.tick);
            b.writeUUID(c.actor); b.writeVarLong(c.generation); b.writeVarInt(c.entityId); b.writeVarInt(c.partySlot);
            b.writeUtf(c.name, 128); b.writeUtf(c.stage, 32); b.writeUtf(c.reason, 64); b.writeUtf(c.intent, 24); b.writeUtf(c.tactics, 24);
            b.writeVarInt(c.permissions); b.writeVarInt(c.chaseRange); b.writeUUID(c.protectedTarget);
            for (var skill : c.skills) {
                b.writeUtf(skill.id, 128); b.writeUtf(skill.version, 384); b.writeUtf(skill.kind, 24);
                b.writeDouble(skill.range); b.writeVarInt(skill.cooldown); b.writeBoolean(skill.available);
                b.writeUtf(skill.label, 128); b.writeVarInt(skill.remaining); b.writeVarInt(skill.maximum); b.writeUtf(skill.reason, 64);
                dev.worldcombat.core.network.PacketJson.write(b, skill.preview.json());
            }
            b.writeVarInt(c.members.size());
            for (var member : c.members) { b.writeVarInt(member.slot); b.writeUtf(member.name, 128); b.writeUtf(member.intent, 24); b.writeUtf(member.stage, 32); }
            dev.worldcombat.core.network.PacketJson.write(b, c.references);
            b.writeVarLong(c.inputToken);
        }
    };
    @Override public Type<ControlState> type() { return TYPE; }
}
