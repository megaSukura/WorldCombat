package dev.worldcombat.core.client;

import com.google.gson.*;
import dev.worldcombat.core.WorldCombatCore;
import dev.worldcombat.core.network.SceneState;
import java.util.*;
import java.util.function.*;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.renderer.RenderType;
import net.neoforged.neoforge.client.event.*;

public final class ClientPresentation {
    private static final Map<String, Consumer<ClientFrame>> scenes = new LinkedHashMap<>(), hud = new LinkedHashMap<>(), world = new LinkedHashMap<>();
    private static final Map<String, Runnable> cleanup = new LinkedHashMap<>();
    private static final Map<String, Runnable> ticks = new LinkedHashMap<>();
    public static Supplier<String> controlData = () -> "{}";
    private record LocalEntry(JsonObject entry, long expires) {}
    private static final List<LocalEntry> localEntries = new ArrayList<>();
    /** Adapter-supplied client-only entries merged into the scene snapshot each render frame; core local entries are merged separately. */
    public static Supplier<String> localScene = () -> "[]";
    /** Core client-only entries ({@link #addLocal}) as a JSON array. */
    static JsonArray coreLocalScene() {
        var array = new JsonArray();
        localEntries.forEach(value -> array.add(value.entry()));
        return array;
    }
    /** Adds one client-only scene entry for {@code ticks} client ticks; {@code ticks <= 0} lasts until reset. */
    public static void addLocal(JsonObject entry, int ticks) {
        if (entry != null) localEntries.add(new LocalEntry(entry, ticks > 0 ? clientTick + ticks : Long.MAX_VALUE));
    }
    private static SceneState latest;
    private static final dev.worldcombat.core.runtime.SceneDelta.Inbox inbox = new dev.worldcombat.core.runtime.SceneDelta.Inbox();
    private static Object connection;
    private static int age;
    private static long clientTick;
    private static final Set<String> failures = new LinkedHashSet<>();
    private static final Set<String> failureNotified = new HashSet<>();
    public record Marker(String text, int color) {}
    private record TimedMarker(Marker marker, long expires) {}
    private static final Map<UUID, TimedMarker> markers = new HashMap<>();
    public static Marker marker(UUID actor) {
        var value = markers.get(actor);
        return value != null && value.expires >= clientTick ? value.marker : null;
    }
    static void marker(String actor, String text, int color) {
        var id = UUID.fromString(actor);
        markers.put(id, new TimedMarker(new Marker(text, color), clientTick + 4));
    }
    public static void reset() {
        for (var handler : java.util.List.copyOf(cleanup.values())) {
            try { handler.run(); }
            catch (RuntimeException failure) { WorldCombatCore.LOGGER.error("Client content cleanup failed", failure); }
        }
        cleanup.clear(); ticks.clear(); scenes.clear(); hud.clear(); world.clear(); markers.clear(); failures.clear(); failureNotified.clear(); localEntries.clear(); ClientFrame.resetBuffers();NativeUiHost.reset(); dev.worldcombat.core.client.particles.ParticleDirector.INSTANCE.reset();
    }
    public static void cleanup(String id, Runnable handler) {
        dev.worldcombat.core.runtime.effect.EffectData.id(id);
        if (handler == null || cleanup.putIfAbsent(id, handler) != null) throw new IllegalArgumentException("Invalid client cleanup");
    }
    /** Client maintenance runs independently of HUD and scene rendering, including world departure. */
    public static void registerTick(String id, Runnable handler) {
        dev.worldcombat.core.runtime.effect.EffectData.id(id);
        if (handler == null || ticks.putIfAbsent(id, handler) != null) throw new IllegalArgumentException("Invalid client tick handler");
    }
    public static void register(String group, String id, int version, Consumer<ClientFrame> callback) {
        dev.worldcombat.core.runtime.effect.EffectData.id(id);
        var map = switch (group) { case "scene" -> scenes; case "hud" -> hud; case "world" -> world; default -> throw new IllegalArgumentException("Unknown presentation channel"); };
        if (callback == null || version < 1 || map.putIfAbsent(id + "@" + version, callback) != null) throw new IllegalArgumentException("Invalid/duplicate client presentation");
    }
    public static void receive(SceneState state) {
        var current = Minecraft.getInstance().getConnection();
        if (current != connection) { connection = current; latest = null; inbox.clear(); }
        if (latest != null && (state.epoch() < latest.epoch() || state.epoch() == latest.epoch() && state.tick() < latest.tick())) return;
        if (inbox.receive(state.revision(), state.data())) { latest = state; age = 0; }
    }
    public static String snapshot() {
        var mc = Minecraft.getInstance();
        return latest != null && mc.level != null && latest.dimension().equals(mc.level.dimension().location().toString()) ? inbox.snapshot() : "[]";
    }
    public static long serverTick() { return latest == null ? 0 : latest.tick() + age; }
    /** Resource-level failures can be reported without disabling the scene that owns other effects. */
    public static void reportFailure(String id, String message) {
        reportFailure("render",id,message);
    }
    public static void reportUiFailure(String id,String message) { reportFailure("ui",id,message); }
    private static void reportFailure(String channel,String id, String message) {
        var mc = Minecraft.getInstance();
        if (mc != null && !mc.isSameThread()) { mc.execute(() -> reportFailure(channel,id, message)); return; }
        String key = String.valueOf(id), detail = String.valueOf(message);
        if (key.length() > 256) key = key.substring(0, 256);
        if (!failures.add(channel+"/"+key)) return;
        WorldCombatCore.LOGGER.error("WorldCombat presentation failure: {}: {}", key, detail.length() > 1024 ? detail.substring(0, 1024) : detail);
        if (mc != null && mc.player != null && failureNotified.add(channel)) {
            mc.player.displayClientMessage(net.minecraft.network.chat.Component.translatable(channel.equals("ui")?"message.world_combat_core.ui_failure":"message.world_combat_core.presentation_failure")
                .withStyle(net.minecraft.ChatFormatting.GOLD), false);
        }
    }
    public static void tick(ClientTickEvent.Post event) {
        NativeUiHost.tick();
        clientTick++;
        markers.values().removeIf(value -> value.expires < clientTick);
        if (!localEntries.isEmpty()) localEntries.removeIf(value -> value.expires < clientTick);
        var current = Minecraft.getInstance().getConnection();
        if (current != connection) { connection = current; latest = null; inbox.clear(); markers.clear(); failures.clear(); failureNotified.clear(); ClientFrame.resetBuffers(); }
        age++;
        for (var key : List.copyOf(ticks.keySet())) {
            var handler = ticks.get(key);
            try { if (handler != null) handler.run(); }
            catch (RuntimeException failure) {
                ticks.remove(key); WorldCombatCore.LOGGER.error("WorldCombat client tick handler disabled: {}", key, failure);
                reportFailure(key, failure.getMessage());
            }
        }
    }
    private static void invoke(Map<String, Consumer<ClientFrame>> map, String key, ClientFrame frame) {
        var handler = map.get(key);
        try { if (handler != null) handler.accept(frame); }
        catch (RuntimeException failure) {
            map.remove(key); WorldCombatCore.LOGGER.error("WorldCombat client handler disabled: {}", key, failure);
            reportFailure(key, failure.getMessage());
        }
        finally { frame.close(); }
    }
    public static void drawHud(GuiGraphics gui) {
        var mc = Minecraft.getInstance(); if (mc.player == null || mc.screen != null || mc.options.hideGui) return;
        String data = controlData.get();
        for (var key : List.copyOf(hud.keySet())) invoke(hud, key, new ClientFrame(data, gui, null));
    }
    public static void render(RenderLevelStageEvent event) {
        if (event.getStage() != RenderLevelStageEvent.Stage.AFTER_ENTITIES) return;
        var entries = JsonParser.parseString(snapshot()).getAsJsonArray();
        entries.addAll(coreLocalScene());
        entries.addAll(JsonParser.parseString(localScene.get()).getAsJsonArray());
        for (var entry : entries) {
            var value = entry.getAsJsonObject();
            invoke(scenes, value.get("type").getAsString() + "@" + value.get("version").getAsInt(), new ClientFrame(entry.toString(), null, event));
        }
        if (!Minecraft.getInstance().options.hideGui)
            for (var key : List.copyOf(world.keySet())) invoke(world, key, new ClientFrame(controlData.get(), null, event));
        Minecraft.getInstance().renderBuffers().bufferSource().endBatch(RenderType.lines());
    }
}
