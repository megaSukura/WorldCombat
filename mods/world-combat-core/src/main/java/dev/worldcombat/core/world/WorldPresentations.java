package dev.worldcombat.core.world;

import com.google.gson.*;
import dev.worldcombat.core.network.SceneState;
import dev.worldcombat.core.runtime.*;
import java.util.*;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.PacketDistributor;

/** Script-published geometry belongs to the action/effect that published it. */
public final class WorldPresentations {
    private record Entry(long owner, ActorHandle source, String dimension, Point position, JsonObject data, long expires, long epoch) {}
    private final MinecraftCombat combat;
    private final Map<String, Entry> entries = new LinkedHashMap<>();
    private record Recipient(ServerPlayer player, long epoch, String dimension, Map<String, JsonObject> entries, long sent) {}
    private final Map<UUID, Recipient> recipients = new HashMap<>();
    private long revision;
    public WorldPresentations(MinecraftCombat combat) { this.combat = combat; }
    public void put(long owner, ActorHandle source, String key, String type, int version, Point point, String json) {
        putFor(owner, source, key, type, version, point, json, 0);
    }
    public void putFor(long owner, ActorHandle source, String key, String type, int version, Point point, String json, int ticks) {
        expire();
        if (owner == 0) throw new IllegalArgumentException("Presentation requires an action or effect lifecycle");
        var actor = combat.resolve(source);
        if (actor == null) throw new IllegalArgumentException("Presentation source unavailable");
        String identity = owner + "/" + key;
        var data = new JsonObject();
        data.addProperty("key", identity); data.addProperty("owner", owner); data.addProperty("source", source.ref());
        data.addProperty("type", type); data.addProperty("version", version);
        var location = new JsonArray(); location.add(point.x()); location.add(point.y()); location.add(point.z());
        data.add("position", location); data.add("data", JsonParser.parseString(json));
        entries.put(identity, new Entry(owner, source, actor.level().dimension().location().toString(), point, data,
            ticks > 0 ? combat.runtime().now() + ticks : 0, CombatServices.CONTENT.epoch()));
    }
    public void release(long owner) { release(owner, "released"); }
    public void release(long owner, String reason) {
        entries.values().removeIf(e -> e.owner == owner && e.expires == 0);
        for (var entry : entries.values()) if (entry.owner == owner && !entry.data.has("lifecycle")) {
            var lifecycle = new JsonObject(); lifecycle.addProperty("tick", combat.runtime().now()); lifecycle.addProperty("reason", reason);
            entry.data.add("lifecycle", lifecycle);
        }
    }
    private void expire() { entries.values().removeIf(e -> e.epoch != CombatServices.CONTENT.epoch() || e.expires > 0 && e.expires <= combat.runtime().now()); }
    public void clear() { entries.clear(); recipients.clear(); }
    public int size() { expire(); return entries.size(); }
    public String snapshot(ServerPlayer player) {
        var result = new JsonArray(); visible(player).values().forEach(result::add); return result.toString();
    }
    private Map<String, JsonObject> visible(ServerPlayer player) {
        expire();
        var result = new LinkedHashMap<String, JsonObject>();
        var origin = MinecraftCombat.point(player.position());
        var visible = entries.values().stream().filter(e -> {
            var source = combat.resolve(e.source);
            boolean sameWorld = e.expires > 0 ? e.dimension.equals(player.level().dimension().location().toString()) : source != null && source.level() == player.level();
            return sameWorld && e.position.minus(origin).length() <= 48;
        }).sorted(Comparator.comparingDouble(e -> e.position.minus(origin).length())).toList();
        for (var entry : visible) {
            result.put(entry.data.get("key").getAsString(), entry.data.deepCopy());
        }
        return result;
    }
    public void tick() {
        expire();
        recipients.entrySet().removeIf(e -> combat.server().getPlayerList().getPlayer(e.getKey()) != e.getValue().player);
        long epoch = CombatServices.CONTENT.epoch(), tick = combat.runtime().now();
        for (var player : combat.server().getPlayerList().getPlayers()) {
            String dimension = player.level().dimension().location().toString();
            var previous = recipients.get(player.getUUID());
            boolean reset = previous == null || previous.epoch != epoch || !previous.dimension.equals(dimension);
            var visible = visible(player);
            var delta = SceneDelta.difference(previous == null ? Map.of() : previous.entries, visible, reset);
            if (SceneDelta.changed(delta) || tick - previous.sent >= 20) {
                PacketDistributor.sendToPlayer(player, new SceneState(epoch, tick, dimension, ++revision, delta.toString()));
                recipients.put(player.getUUID(), new Recipient(player, epoch, dimension, visible, tick));
            }
        }
    }
}
