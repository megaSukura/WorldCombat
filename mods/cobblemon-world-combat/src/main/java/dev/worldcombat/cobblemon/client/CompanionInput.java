package dev.worldcombat.cobblemon.client;

import com.cobblemon.mod.common.client.CobblemonClient;
import com.mojang.blaze3d.platform.InputConstants;
import dev.worldcombat.cobblemon.control.ControlConfig;
import dev.worldcombat.cobblemon.control.PreviewSession;
import dev.worldcombat.cobblemon.network.*;
import dev.worldcombat.core.runtime.Point;
import net.minecraft.client.*;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.*;
import net.neoforged.neoforge.client.event.*;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.network.PacketDistributor;
import org.lwjgl.glfw.GLFW;
import java.util.*;

public final class CompanionInput {
    private static final String CATEGORY = "key.categories.worldcombat";
    public static final KeyMapping[] SKILLS = {
        new KeyMapping("key.worldcombat.skill1", GLFW.GLFW_KEY_Z, CATEGORY),
        new KeyMapping("key.worldcombat.skill2", GLFW.GLFW_KEY_X, CATEGORY),
        new KeyMapping("key.worldcombat.skill3", GLFW.GLFW_KEY_C, CATEGORY),
        new KeyMapping("key.worldcombat.skill4", GLFW.GLFW_KEY_V, CATEGORY)
    };
    public static final KeyMapping PRECISION = new KeyMapping("key.worldcombat.precision", GLFW.GLFW_KEY_GRAVE_ACCENT, CATEGORY);
    public static final KeyMapping QUICK_MODIFIER = new KeyMapping("key.worldcombat.quick_modifier", GLFW.GLFW_KEY_RIGHT_CONTROL, CATEGORY);
    public static final KeyMapping CANCEL = new KeyMapping("key.worldcombat.cancel", GLFW.GLFW_KEY_ESCAPE, CATEGORY);
    public static final KeyMapping CONFIRM = new KeyMapping("key.worldcombat.confirm", InputConstants.Type.MOUSE, GLFW.GLFW_MOUSE_BUTTON_LEFT, CATEGORY);
    public static final KeyMapping BACK = new KeyMapping("key.worldcombat.back", InputConstants.Type.MOUSE, GLFW.GLFW_MOUSE_BUTTON_RIGHT, CATEGORY);
    public static final KeyMapping ROTATE_LEFT = new KeyMapping("key.worldcombat.rotate_left", GLFW.GLFW_KEY_LEFT_BRACKET, CATEGORY);
    public static final KeyMapping ROTATE_RIGHT = new KeyMapping("key.worldcombat.rotate_right", GLFW.GLFW_KEY_RIGHT_BRACKET, CATEGORY);
    public static final KeyMapping TARGET_PLAYER = new KeyMapping("key.worldcombat.target_player", GLFW.GLFW_KEY_RIGHT_ALT, CATEGORY);
    public static final KeyMapping[] QUICK_SKILLS = java.util.stream.IntStream.range(0, 4)
        .mapToObj(i -> new KeyMapping("key.worldcombat.quick_skill" + (i + 1), GLFW.GLFW_KEY_1 + i, CATEGORY)).toArray(KeyMapping[]::new);
    private static final PreviewSession preview = new PreviewSession();
    private static final Set<InputConstants.Key> consumed = new HashSet<>();
    private static final com.google.gson.Gson JSON = new com.google.gson.Gson();
    private static ControlState state;
    private static Object connection;
    private static long sequence;
    private static long awaiting;
    private static int observedParty = -1;
    private static boolean quickHeld;
    private static double rotation;
    private static String localReason = "";
    private static long messageUntil;
    private static long stateReceived;
    private static long clientTick;
    private static long feedbackSequence;
    public record Aim(UUID target, Point point, Point direction, Vec3 origin, Vec3 end, String reason) {}

    public static void setup() {
        dev.worldcombat.core.client.ClientPresentation.controlData = CompanionInput::clientData;
        dev.worldcombat.core.client.ClientPresentation.localScene = () -> CompanionContentClient.localScene(ComplexInput.scene());
        ControlNetwork.clientReceiver = CompanionInput::receive;
        NeoForge.EVENT_BUS.addListener(CompanionInput::tick);
        NeoForge.EVENT_BUS.addListener(CompanionInput::mouse);
        NeoForge.EVENT_BUS.addListener(CompanionPreview::render);
        NeoForge.EVENT_BUS.addListener(CompanionMarker::render);
        CompanionContentClient.setup();
    }
    public static void registerKeys(RegisterKeyMappingsEvent event) {
        for (var key : SKILLS) event.register(key);
        for (var key : QUICK_SKILLS) event.register(key);
        event.register(PRECISION); event.register(QUICK_MODIFIER); event.register(CANCEL);
        event.register(CONFIRM); event.register(BACK); event.register(ROTATE_LEFT); event.register(ROTATE_RIGHT);
        event.register(TARGET_PLAYER);
        CompanionContentClient.keys(event);
    }
    public static ControlState state() { return state; }
    public static int previewSlot() { return preview.active() ? preview.slot() : -1; }
    private static boolean inGame() {
        var mc = Minecraft.getInstance();
        return mc.player != null && mc.level != null && mc.screen == null && mc.isWindowActive() && !mc.isPaused();
    }
    public static boolean key(long window, int key, int scan, int action) {
        if (window != Minecraft.getInstance().getWindow().getWindow()) return false;
        return input(InputConstants.getKey(key, scan), action);
    }
    private static void mouse(InputEvent.MouseButton.Pre event) {
        if (input(InputConstants.Type.MOUSE.getOrCreate(event.getButton()), event.getAction())) event.setCanceled(true);
    }
    private static boolean input(InputConstants.Key key, int action) {
        if (CompanionContentClient.input(key, action)) {
            if (action == GLFW.GLFW_PRESS) consumed.add(key);
            else if (action == GLFW.GLFW_RELEASE) consumed.remove(key);
            return true;
        }
        boolean isPrecision = PRECISION.getKey().equals(key), isQuick = QUICK_MODIFIER.getKey().equals(key);
        boolean wasConsumed = consumed.contains(key);
        if (action == GLFW.GLFW_RELEASE) {
            consumed.remove(key);
            if (isQuick) quickHeld = false;
            if (isPrecision) {
                int slot = preview.release();
                if (inGame() && slot >= 0) cast(slot);
            }
            return wasConsumed;
        }
        if (!inGame()) { preview.cancel(); quickHeld = false; return false; }
        if (state == null || state.skills().stream().noneMatch(skill -> !skill.id().isEmpty())) return false;
        if (action == GLFW.GLFW_REPEAT) return wasConsumed;
        if (isQuick) quickHeld = true;
        boolean handled = isQuick && ControlConfig.MODIFIER_DIGITS.get();
        if (isPrecision) {
            rotation = 0; preview.press(); handled = true;
        } else if ((preview.active() || ComplexInput.active()) && CANCEL.getKey().equals(key)) {
            preview.cancel(); ComplexInput.cancel(); notifyReason("preview-cancelled"); handled = true;
        } else if (CANCEL.getKey().equals(key) && Set.of("approaching", "queued", "waiting-cooldown", "waiting-action").contains(state.reason())) {
            CompanionContentClient.command("cancel-cast", "null");handled=true;
        } else if (CONFIRM.getKey().equals(key) && ComplexInput.choose(false)) {
            handled = true;
        } else if (BACK.getKey().equals(key) && ComplexInput.active()) {
            if (!ComplexInput.choose(true)) { ComplexInput.cancel(); notifyReason("preview-cancelled"); }
            handled = true;
        } else if (previewSlot() >= 0 && state.skills().get(previewSlot()).preview().rotation().equals("cardinal")
            && (ROTATE_LEFT.getKey().equals(key) || ROTATE_RIGHT.getKey().equals(key))) {
            rotation += (ROTATE_LEFT.getKey().equals(key) ? -1 : 1) * Math.PI / 2; handled = true;
        } else {
            int slot = -1;
            if (ControlConfig.MODIFIER_DIGITS.get()) {
                if (quickHeld || preview.active())
                    for (int i = 0; i < 4; i++) if (QUICK_SKILLS[i].getKey().equals(key)) { slot = i; break; }
            } else {
                for (int i = 0; i < 4; i++) if (SKILLS[i].getKey().equals(key)) { slot = i; break; }
            }
            if (slot >= 0) {
                if (preview.active()) { preview.select(slot); rotation = 0; }
                else cast(slot);
                handled = true;
            }
        }
        if (handled) consumed.add(key);
        return handled;
    }
    private static void tick(ClientTickEvent.Post event) {
        var mc = Minecraft.getInstance(); clientTick++;
        ComplexInput.tick(inGame(), clientTick);
        if (mc.getConnection() != connection) {
            connection = mc.getConnection(); state = null; sequence = 0; awaiting = 0; observedParty = -1;
            preview.reset(); consumed.clear(); quickHeld = false; localReason = "";
        }
        if (!inGame()) { preview.cancel(); quickHeld = false; }
        if (!physicallyDown(PRECISION.getKey())) {
            if (!inGame()) preview.release();
            else if (!preview.active()) preview.release();
        }
        consumed.removeIf(key -> !physicallyDown(key));
        if (state != null && mc.player != null) {
            int slot = CobblemonClient.INSTANCE.getStorage().getSelectedSlot();
            if (observedParty >= 0 && slot != observedParty) {
                observedParty = slot; preview.cancel();
                send("select", 0, new Aim(ControlCommand.NONE, zero(), forward(), Vec3.ZERO, Vec3.ZERO, ""), "");
            }
            observedParty = slot;
            if (actor() == null) preview.cancel();
        }
    }
    static boolean physicallyDown(InputConstants.Key key) {
        long window = Minecraft.getInstance().getWindow().getWindow();
        return key.getType() == InputConstants.Type.MOUSE ? GLFW.glfwGetMouseButton(window, key.getValue()) == GLFW.GLFW_PRESS
            : key.getType() == InputConstants.Type.KEYSYM && key.getValue() >= 0 && InputConstants.isKeyDown(window, key.getValue());
    }
    private static void receive(ControlState update) {
        if (state != null && state.session().equals(update.session())
            && (update.tick() < state.tick() || update.sequence() < state.sequence())) return;
        if (state == null || !state.session().equals(update.session())) { sequence = update.sequence(); awaiting = 0; observedParty = -1; }
        if (state != null && (!state.actor().equals(update.actor()) || state.generation() != update.generation() || state.epoch() != update.epoch()))
            preview.cancel();
        if (state != null && previewSlot() >= 0
            && !state.skills().get(previewSlot()).version().equals(update.skills().get(previewSlot()).version())) {
            preview.cancel(); notifyReason("loadout-changed");
        }
        if (update.sequence() >= awaiting && (!update.reason().equals(state == null ? "" : state.reason())
            || state != null && update.sequence() > state.sequence()))
            notifyReason(update.reason());
        ComplexInput.changed(state, update); state = update; stateReceived = clientTick;
    }
    public static LivingEntity actor() {
        var mc = Minecraft.getInstance();
        if (state == null || mc.level == null) return null;
        var entity = mc.level.getEntity(state.entityId());
        return entity instanceof LivingEntity living && living.getUUID().equals(state.actor()) && living.isAlive() ? living : null;
    }
    private static Point zero() { return new Point(0, 0, 0); }
    private static Point forward() { return new Point(0, 0, 1); }
    public static Aim aim(int slot) {
        return aim(slot, physicallyDown(TARGET_PLAYER.getKey()) ? "player" : "look");
    }
    public static Aim aim(int slot, String mode) {
        var mc = Minecraft.getInstance();
        var actor = actor();
        if (actor == null || mc.player == null || state == null) return null;
        var skill = state.skills().get(slot);
        String kind = ComplexInput.kind(slot).equals("entity") ? "aim" : skill.kind();
        Vec3 origin = actor.getBoundingBox().getCenter();
        Vec3 eye = mc.player.getEyePosition(), look = mc.player.getLookAngle();
        Vec3 rayEnd = eye.add(look.scale(48));
        var block = mc.level.clip(new ClipContext(eye, rayEnd, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, mc.player));
        Vec3 picked = block.getLocation();
        double nearest = eye.distanceToSqr(picked);
        LivingEntity target = null;
        boolean self = kind.equals("self"), playerTarget = !self && mode.equals("player");
        for (var candidate : mc.level.getEntitiesOfClass(LivingEntity.class, new AABB(eye, rayEnd).inflate(1),
                e -> e.isAlive() && e != mc.player && (e != actor || kind.equals("friend")))) {
            var hit = candidate.getBoundingBox().inflate(0.25).clip(eye, picked);
            if (hit.isPresent() && eye.distanceToSqr(hit.get()) < nearest) {
                nearest = eye.distanceToSqr(hit.get()); target = candidate; picked = closest(candidate.getBoundingBox(), hit.get());
            }
        }
        boolean friend = kind.equals("friend");
        if (self) { target = actor; picked = actor.getBoundingBox().getCenter(); }
        else if (playerTarget) { target = mc.player; picked = mc.player.getBoundingBox().getCenter(); }
        boolean entityPoint = kind.equals("point") && skill.preview().input().sustained() && target != null;
        if (kind.equals("point") || kind.equals("motion")) { target = null; if (!entityPoint) picked = block.getLocation(); }
        if (friend && target == null) {
            if (!state.protectedTarget().equals(ControlCommand.NONE))
                for (var ally : mc.level.getEntitiesOfClass(LivingEntity.class, actor.getBoundingBox().inflate(32)))
                    if (ally.getUUID().equals(state.protectedTarget())) { target = ally; break; }
            if (target == null) target = actor;
            picked = target.getBoundingBox().getCenter();
        }
        if (target == null && !playerTarget && block.getType() == HitResult.Type.MISS && !entityPoint) picked = origin.add(look.scale(Math.max(1, skill.range() - 0.25)));
        else if (target == null && !playerTarget && kind.equals("point") && !entityPoint && block.getType() == HitResult.Type.BLOCK) picked = picked.add(((BlockHitResult) block).getDirection().getNormal().getX() * 0.02,
            ((BlockHitResult) block).getDirection().getNormal().getY() * 0.02, ((BlockHitResult) block).getDirection().getNormal().getZ() * 0.02);
        // Directional casts keep camera pitch; horizontal motion and cardinal placement explicitly
        // request a ground heading. Native riding continues to own the mount's body rotation.
        boolean groundHeading = skill.preview().motion().equals("horizontal") || skill.preview().rotation().equals("cardinal");
        Vec3 direction = groundHeading ? new Vec3(look.x, 0, look.z).normalize() : look.normalize();
        if (direction.lengthSqr() < 0.001) direction = new Vec3(0, 0, 1);
        direction = direction.yRot((float) rotation);
        Vec3 end = picked;
        String reason = "";
        if (origin.distanceTo(target == null ? picked : closest(target.getBoundingBox(), origin)) > skill.range()) reason = "out-of-range";
        if (!skill.available()) reason = skill.reason().isEmpty() ? "content-unavailable" : skill.reason();
        if (skill.preview().lineOfSight()) {
            var obstruction = mc.level.clip(new ClipContext(origin, picked, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, actor));
            if (obstruction.getType() != HitResult.Type.MISS) { end = obstruction.getLocation(); if (reason.isEmpty()) reason = "path-blocked"; }
        }
        if (!skill.preview().cells().isEmpty()) {
            var cells = dev.worldcombat.core.world.CombatGeometry.cells(skill.preview(), point(picked), point(direction));
            String placement = dev.worldcombat.core.world.CombatGeometry.placementReason(mc.level, cells, skill.preview().ground(), skill.preview().replace());
            if (reason.isEmpty()) reason = placement;
        }
        if (!skill.preview().motion().equals("none")) {
            boolean horizontal = skill.preview().motion().equals("horizontal");
            end = dev.worldcombat.core.world.CombatGeometry.motionEnd(actor, point(picked), skill.range(), horizontal);
            if (end.distanceTo(new Vec3(picked.x, horizontal ? actor.getY() : picked.y, picked.z)) > 0.2 && reason.isEmpty()) reason = "path-blocked";
        }
        return new Aim(target == null ? ControlCommand.NONE : target.getUUID(), point(picked), point(direction), origin, end, reason);
    }
    private static Point point(Vec3 v) { return new Point(v.x, v.y, v.z); }
    private static Vec3 closest(AABB box, Vec3 point) {
        var result = dev.worldcombat.core.world.CombatGeometry.bounds(box).closest(point(point));
        return new Vec3(result.x(), result.y(), result.z());
    }
    private static void cast(int slot) {
        if (state == null || actor() == null) { notifyReason("send-out"); return; }
        var aim = aim(slot);
        if (aim == null) return;
        if (!aim.reason().isEmpty() && !aim.reason().equals("path-blocked") && !aim.reason().equals("out-of-range")) { notifyReason(aim.reason()); return; }
        if (ComplexInput.begin(slot)) return;
        send("cast", slot, aim, state.skills().get(slot).version());
    }
    public static String clientData() {
        var json = state == null ? new com.google.gson.JsonObject() : JSON.toJsonTree(state.atTick(state.tick() + clientTick - stateReceived)).getAsJsonObject();
        json.addProperty("previewSlot", previewSlot());
        json.addProperty("precisionHeld", preview.active());
        json.add("input", ComplexInput.status());
        json.addProperty("hint", messageUntil >= clientTick ? label("reason", localReason).getString() : "");
        json.addProperty("feedbackSequence", feedbackSequence);
        json.addProperty("feedbackReason", localReason);
        json.addProperty("feedbackUntil", messageUntil);
        json.addProperty("clientTick", clientTick);
        json.addProperty("playerTargetKey", binding(TARGET_PLAYER));
        json.addProperty("precisionKey", binding(PRECISION));
        json.addProperty("confirmKey", binding(CONFIRM)); json.addProperty("backKey", binding(BACK)); json.addProperty("cancelKey", binding(CANCEL));
        json.addProperty("rotateLeftKey", binding(ROTATE_LEFT)); json.addProperty("rotateRightKey", binding(ROTATE_RIGHT));
        json.addProperty("modifierKey", binding(QUICK_MODIFIER));
        var keys = new com.google.gson.JsonArray();
        var castKeys = new com.google.gson.JsonArray();
        for (int i = 0; i < 4; i++) {
            String key = binding(ControlConfig.MODIFIER_DIGITS.get() ? QUICK_SKILLS[i] : SKILLS[i]);
            keys.add(key); castKeys.add(ControlConfig.MODIFIER_DIGITS.get() ? binding(QUICK_MODIFIER) + "+" + key : key);
        }
        json.add("keys", keys); json.add("castKeys", castKeys); return json.toString();
    }
    private static void send(String operation, int value, Aim aim, String version) {
        submit(operation, value, aim, version, "{}");
    }
    static long submit(String operation, int value, Aim aim, String version, String input) {
        if (state == null || Minecraft.getInstance().getConnection() == null) return 0;
        ++sequence;
        if (!operation.equals("input-update")) awaiting = sequence;
        var packet = new ControlCommand(state.session(), sequence, state.epoch(), state.tick(), state.actor(), state.generation(),
            operation.equals("select") ? observedParty : state.partySlot(), operation, value, aim.target(), aim.point(), aim.direction(), version, input);
        PacketDistributor.sendToServer(packet);
        if (operation.equals("cast")) notifyReason("requested");
        return sequence;
    }
    /** The individual UUID is authoritative even if the live roster changes while a menu is open. */
    public static void select(UUID pokemon) {
        submit("select-individual", 0, new Aim(pokemon, zero(), forward(), Vec3.ZERO, Vec3.ZERO, ""), "", "{}");
    }
    public static void notifyReason(String reason) {
        if (reason == null || reason.isEmpty() || Set.of("ready", "accepted", "cancelled", "selected").contains(reason)) return;
        localReason = reason; messageUntil = clientTick + 90; feedbackSequence++;
    }
    public static Component label(String group, String id) {
        String key = net.minecraft.client.resources.language.I18n.exists(id) ? id : "worldcombat." + group + "." + id;
        if (group.equals("reason") && id.equals("send-out"))
            return Component.translatable("worldcombat.ui.send_out", binding(com.cobblemon.mod.common.client.keybind.keybinds.PartySendBinding.INSTANCE));
        if (group.equals("reason") && id.equals("previewing"))
            return Component.translatable("worldcombat.ui.precision_preview", "", binding(PRECISION), binding(CANCEL));
        return Component.translatable(key);
    }
    public static String binding(KeyMapping key) { return key.getTranslatedKeyMessage().getString(); }
}
