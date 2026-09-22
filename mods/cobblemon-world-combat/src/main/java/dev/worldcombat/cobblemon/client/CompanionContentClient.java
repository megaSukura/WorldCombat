package dev.worldcombat.cobblemon.client;

import com.cobblemon.mod.common.client.CobblemonClient;
import com.cobblemon.mod.common.client.gui.summary.Summary;
import com.cobblemon.mod.common.client.gui.summary.widgets.screens.moves.MovesWidget;
import com.cobblemon.mod.common.client.gui.summary.widgets.screens.moves.MoveSwapScreen;
import dev.worldcombat.cobblemon.mixin.SummaryPokemonAccess;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mojang.blaze3d.platform.InputConstants;
import dev.worldcombat.cobblemon.network.*;
import dev.worldcombat.core.client.NativeUiHost;
import dev.worldcombat.core.client.ClientCallbacks;
import dev.worldcombat.core.runtime.Point;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.*;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.event.ScreenEvent;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.network.PacketDistributor;
import org.lwjgl.glfw.GLFW;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Predicate;

/** Transport and remappable input for script-owned companion interfaces. */
public final class CompanionContentClient {
    public static final KeyMapping COMMAND = new KeyMapping("key.worldcombat.command", GLFW.GLFW_KEY_G, "key.categories.worldcombat");
    public static final KeyMapping SETTINGS = new KeyMapping("key.worldcombat.preferences", GLFW.GLFW_KEY_H, "key.categories.worldcombat");
    private static final Gson JSON = new Gson();
    private static Predicate<String> input;
    private static Consumer<String> updates;
    private static Consumer<String> replies;
    private static long sequence;
    private static UUID session;
    private static long epoch;
    private static boolean commandHeld;
    private static UUID inspection;
    private static String indicator = "[]";
    private static final java.util.Map<String, Long> requested = new java.util.HashMap<>();
    private CompanionContentClient() {}
    public static void setup() {
        ControlNetwork.contentReceiver = CompanionContentClient::receive;
        ControlNetwork.contentInvalidationReceiver = CompanionContentClient::invalidate;
        NeoForge.EVENT_BUS.addListener(CompanionContentClient::tick);
        NeoForge.EVENT_BUS.addListener((ScreenEvent.Render.Pre ignored) -> SummaryContentBridge.beginFrame());
    }
    public static void keys(RegisterKeyMappingsEvent event) { event.register(COMMAND); event.register(SETTINGS); }
    public static void listen(Predicate<String> handler, Consumer<String> tick, Consumer<String> reply) {
        input = ClientCallbacks.predicate("companion-ui/input", handler);
        updates = ClientCallbacks.consumer("companion-ui/update", tick);
        replies = ClientCallbacks.consumer("companion-ui/reply", reply);
    }
    public static String pokemon() {
        var storage = CobblemonClient.INSTANCE.getStorage();
        var pokemon = inspection == null ? storage.getParty().get(storage.getSelectedSlot()) : storage.getParty().findByUUID(inspection);
        return pokemon == null ? "" : pokemon.getUuid().toString();
    }
    public static String data() {
        var data = com.google.gson.JsonParser.parseString(CompanionInput.clientData()).getAsJsonObject();
        data.addProperty("pokemon", pokemon());
        var storage = CobblemonClient.INSTANCE.getStorage();
        var selected = inspection == null ? storage.getParty().get(storage.getSelectedSlot()) : storage.getParty().findByUUID(inspection);
        data.addProperty("inspection", inspection != null);
        if (inspection != null) {
            data.remove("skills");
            data.addProperty("actor", "");
            data.addProperty("entityId", -1);
            data.addProperty("hint", "");
        }
        if (selected != null) {
            var nativeMoves = new com.google.gson.JsonArray();
            for (var move : selected.getMoveSet().getMovesWithNulls()) nativeMoves.add(move == null ? "" : move.getName());
            data.add("nativeMoves", nativeMoves);
            data.addProperty("species", selected.getSpecies().getResourceIdentifier().toString());
            data.addProperty("level", selected.getLevel());
            if (inspection != null || !data.has("name") || data.get("name").getAsString().isEmpty()) data.addProperty("name", selected.getDisplayName(false).getString());
        }
        data.addProperty("commandKey", CompanionInput.binding(COMMAND));
        data.addProperty("settingsKey", CompanionInput.binding(SETTINGS));
        data.addProperty("screen", Minecraft.getInstance().screen != null);
        data.addProperty("uiActive", NativeUiHost.active());
        return data.toString();
    }
    public static long request(String channel, String pokemon, String data) {
        var state = CompanionInput.state();
        if (state == null || Minecraft.getInstance().getConnection() == null) return 0;
        synchronizeSession(state);
        long next = ++sequence;
        requested.put(channel, next);
        PacketDistributor.sendToServer(new ContentRequest(state.session(), next, state.epoch(), state.tick(), channel, UUID.fromString(pokemon), data));
        return next;
    }
    private static void receive(ContentReply reply) {
        var state = CompanionInput.state();
        if (state == null || !state.session().equals(reply.session()) || state.epoch() != reply.epoch()) return;
        synchronizeSession(state);
        if (reply.sequence() != requested.getOrDefault(reply.channel(), -1L)) return;
        if (replies != null) replies.accept(JSON.toJson(reply));
    }
    private static void invalidate(ContentInvalidation change) {
        var state = CompanionInput.state();
        if (state == null || !state.session().equals(change.session()) || state.epoch() != change.epoch()) return;
        if (input != null) {
            var event = new JsonObject(); event.addProperty("key", "invalidate"); event.addProperty("pressed", true);
            event.addProperty("channel", change.channel()); event.addProperty("pokemon", change.pokemon().toString()); event.addProperty("revision", change.revision());
            input.test(event.toString());
        }
    }
    public static boolean input(InputConstants.Key key, int action) {
        if (input == null || Minecraft.getInstance().player == null || !Minecraft.getInstance().isWindowActive()) return false;
        String name = COMMAND.getKey().equals(key) ? "command" : SETTINGS.getKey().equals(key) ? "settings"
            : CompanionInput.CONFIRM.getKey().equals(key) ? "confirm" : CompanionInput.BACK.getKey().equals(key) ? "back"
            : CompanionInput.CANCEL.getKey().equals(key) ? "cancel" : "";
        if (name.isEmpty() || action == GLFW.GLFW_REPEAT) return false;
        if (action == GLFW.GLFW_PRESS && !NativeUiHost.active() && Minecraft.getInstance().screen != null)
            return name.equals("settings") && SummaryContentBridge.activateFocused();
        if (name.equals("command")) commandHeld = action == GLFW.GLFW_PRESS;
        var event = new JsonObject(); event.addProperty("key", name); event.addProperty("pressed", action == GLFW.GLFW_PRESS);
        return input.test(event.toString());
    }
    private static void tick(ClientTickEvent.Post ignored) {
        var state = CompanionInput.state();
        if (state == null) { inspection = null; return; }
        if (!NativeUiHost.active()) inspection = null;
        synchronizeSession(state);
        if (commandHeld && (!Minecraft.getInstance().isWindowActive() || !CompanionInput.physicallyDown(COMMAND.getKey()))) {
            commandHeld = false;
            if (input != null) input.test(Minecraft.getInstance().isWindowActive()
                ? "{\"key\":\"command\",\"pressed\":false}" : "{\"key\":\"cancel\",\"pressed\":true}");
        }
        if (updates != null) updates.accept(data());
    }
    /** Input can dispatch between a new control snapshot and the next client tick. */
    private static void synchronizeSession(ControlState state) {
        if (state.session().equals(session) && state.epoch() == epoch) return;
        session = state.session(); epoch = state.epoch(); sequence = 0;
        requested.clear(); indicator = "[]"; inspection = null;
    }
    public static String look() { return JSON.toJson(lookAim()); }
    public static String aim(String kind) {
        if (!kind.equals("self") && !kind.equals("player")) return look();
        var mc = Minecraft.getInstance();
        var entity = kind.equals("player") ? mc.player : CompanionInput.actor();
        if (entity == null || mc.player == null) return "null";
        var at = entity.getBoundingBox().getCenter();
        var direction = mc.player.getLookAngle();
        return JSON.toJson(new CompanionInput.Aim(entity.getUUID(), new Point(at.x, at.y, at.z),
            new Point(direction.x, direction.y, direction.z), mc.player.getEyePosition(), at, ""));
    }
    public static long cast(int slot, String aimJson) {
        var state = CompanionInput.state();
        if (state == null || CompanionInput.actor() == null || slot < 0 || slot >= state.skills().size()) {
            CompanionInput.notifyReason("send-out"); return 0;
        }
        var aim = aimJson == null || aimJson.isBlank() ? CompanionInput.aim(slot) : JSON.fromJson(aimJson, CompanionInput.Aim.class);
        if (aim == null) return 0;
        if (!aim.reason().isEmpty() && !aim.reason().equals("path-blocked") && !aim.reason().equals("out-of-range")) { CompanionInput.notifyReason(aim.reason()); return 0; }
        return CompanionInput.submit("cast", slot, aim, state.skills().get(slot).version(), "{}");
    }
    public static boolean dispatch(String key) {
        if (input == null) return false;
        var control = CompanionInput.state();
        if (control != null) synchronizeSession(control);
        var event = new JsonObject(); event.addProperty("key", key); event.addProperty("pressed", true);
        return input.test(event.toString());
    }
    public static boolean dispatch(String key, String pokemon, String move) {
        if (input == null) return false;
        var control = CompanionInput.state();
        if (control != null) synchronizeSession(control);
        UUID uuid;
        try { uuid = UUID.fromString(pokemon); }
        catch (IllegalArgumentException invalid) { return false; }
        if (CobblemonClient.INSTANCE.getStorage().getParty().findByUUID(uuid) == null) return false;
        Runnable restore = null;
        if (Minecraft.getInstance().screen instanceof Summary summary) {
            var access = (SummaryPokemonAccess) (Object) summary;
            var selected = access.worldcombat$mainScreen() instanceof MovesWidget moves ? moves.getSelectedMove() : null;
            var swapping = summary.getSideScreen() instanceof MoveSwapScreen swap ? swap : null;
            restore = () -> {
                if (access.worldcombat$mainScreen() instanceof MovesWidget moves && selected != null) moves.selectMove(selected);
                if (swapping != null) summary.displaySideScreen(Summary.MOVE_SWAP, swapping.getReplacedMove());
            };
        }
        inspection = uuid;
        if (updates != null) updates.accept(data());
        var event = new JsonObject();
        event.addProperty("key", key); event.addProperty("pressed", true); event.addProperty("move", move);
        boolean handled = input.test(event.toString());
        if (restore != null && NativeUiHost.active()) NativeUiHost.onReturn(restore);
        if (!NativeUiHost.active()) inspection = null;
        return handled;
    }
    public static void indicator(String json) {
        if (json.length() > 4096) throw new IllegalArgumentException("Indicator too large");
        indicator = json.isEmpty() ? "[]" : "[" + json + "]";
    }
    static String localScene(String existing) {
        var values = com.google.gson.JsonParser.parseString(existing).getAsJsonArray();
        values.addAll(com.google.gson.JsonParser.parseString(indicator).getAsJsonArray());
        return values.toString();
    }
    private static CompanionInput.Aim lookAim() {
        var mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return null;
        Vec3 eye = mc.player.getEyePosition(), direction = mc.player.getLookAngle(), end = eye.add(direction.scale(40));
        var hit = mc.level.clip(new ClipContext(eye, end, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, mc.player));
        Vec3 point = hit.getLocation(); double distance = eye.distanceToSqr(point); UUID target = ControlCommand.NONE;
        for (var entity : mc.level.getEntitiesOfClass(LivingEntity.class, new AABB(eye, point).inflate(1), e -> e.isAlive() && e != mc.player && e != CompanionInput.actor())) {
            var intersection = entity.getBoundingBox().inflate(.15).clip(eye, point);
            if (intersection.isPresent() && eye.distanceToSqr(intersection.get()) < distance) {
                distance = eye.distanceToSqr(intersection.get()); point = intersection.get(); target = entity.getUUID();
            }
        }
        return new CompanionInput.Aim(target, new Point(point.x, point.y, point.z), new Point(direction.x, direction.y, direction.z), eye, point, "");
    }
    public static long command(String operation, String aimJson) {
        var aim = JSON.fromJson(aimJson, CompanionInput.Aim.class);
        if (aim == null) aim = lookAim();
        return aim == null ? 0 : CompanionInput.submit(operation, 0, aim, "", "{}");
    }
}
