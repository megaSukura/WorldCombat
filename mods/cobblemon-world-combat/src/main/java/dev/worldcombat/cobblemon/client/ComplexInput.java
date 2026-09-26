package dev.worldcombat.cobblemon.client;

import com.google.gson.*;
import com.mojang.blaze3d.platform.InputConstants;
import dev.worldcombat.core.client.ClientPresentation;
import dev.worldcombat.cobblemon.control.ControlConfig;
import dev.worldcombat.cobblemon.network.ControlState;
import java.util.*;

/** Generic selection/hold state machine, configured by the skill's script input declaration. */
public final class ComplexInput {
    private static long counter;
    private static final class Session {
        final int slot;
        final long token = ++counter;
        final String version;
        final boolean channel;
        final boolean menu;
        final InputConstants.Key held;
        final List<JsonObject> samples = new ArrayList<>();
        long started, lastInputTick;
        String lastInput = "";
        CompanionInput.Aim aim;
        Session(int slot, boolean channel, boolean menu) {
            this.slot = slot; this.channel = channel; this.menu = menu;
            version = CompanionInput.state().skills().get(slot).version();
            held = (ControlConfig.MODIFIER_DIGITS.get() ? CompanionInput.QUICK_SKILLS[slot] : CompanionInput.SKILLS[slot]).getKey();
        }
    }
    // A selection wizard may collect a compatible next cast while the held action keeps receiving its own aim.
    private static Session selection, sustained;
    private static Session focus() { return selection != null ? selection : sustained; }
    public static int slot() { var current = focus(); return current == null ? -1 : current.slot; }
    public static boolean active() { return focus() != null; }
    public static String kind() { return kind(slot()); }
    public static String kind(int slot) {
        var current = selection != null && selection.slot == slot ? selection : sustained != null && sustained.slot == slot ? sustained : null;
        return current == null ? "" : CompanionInput.state().skills().get(slot).preview().input().steps().get(current.channel ? 0 : current.samples.size());
    }
    public static JsonObject status() {
        var result = new JsonObject();
        var current = focus();
        if (current != null) {
            result.addProperty("mode", current.channel ? "sustained" : "selection");
            result.addProperty("slot", current.slot);
            result.addProperty("menu", current.menu);
            result.addProperty("step", current.samples.size() + 1);
            result.addProperty("total", CompanionInput.state().skills().get(current.slot).preview().input().steps().size());
        }
        return result;
    }
    public static boolean begin(int selection) { return begin(selection, null, false); }
    /** Menu picks supply their first sample; channels remain active until explicitly stopped. */
    public static boolean begin(int selection, CompanionInput.Aim firstAim, boolean menu) {
        var state = CompanionInput.state(); var spec = state.skills().get(selection).preview().input();
        ComplexInput.selection = null;
        if (spec.steps().isEmpty()) return false;
        var current = new Session(selection, spec.sustained(), menu);
        if (spec.sustained()) {
            if (!menu && !CompanionInput.physicallyDown(current.held)) { CompanionInput.notifyReason("hold-skill"); return true; }
            stopSustained(); sustained = current;
            var sample = sample(current, firstAim);
            if (sample == null) { sustained = null; return true; }
            current.samples.add(sample);
            current.started = CompanionInput.submit("cast", current.slot, current.aim, current.version, payload(current));
        } else {
            ComplexInput.selection = current;
            if (menu && firstAim != null) choose(false, firstAim);
        }
        return true;
    }
    private static void stopSustained() {
        var current = sustained; sustained = null;
        if (current != null && current.aim != null) CompanionInput.submit("input-stop", current.slot, current.aim, Long.toString(current.token), "{}");
    }
    public static void release() {
        var current = sustained; sustained = null;
        if (current != null && current.aim != null) CompanionInput.submit("input-release", current.slot, current.aim, Long.toString(current.token), payload(current));
    }
    public static void cancel() {
        selection = null; stopSustained();
    }
    public static void changed(ControlState before, ControlState after) {
        if (!active()) return;
        if (before == null || !before.session().equals(after.session()) || !before.actor().equals(after.actor()) || before.epoch() != after.epoch()
            || before.generation() != after.generation()) { cancel(); return; }
        if (selection != null && !selection.version.equals(after.skills().get(selection.slot).version())) selection = null;
        if (sustained != null && (!sustained.version.equals(after.skills().get(sustained.slot).version())
            || after.sequence() >= sustained.started && after.inputToken() != sustained.token)) stopSustained();
    }
    public static boolean choose(boolean back) { return choose(back, null); }
    private static boolean choose(boolean back, CompanionInput.Aim firstAim) {
        if (selection == null && sustained != null && sustained.menu) { if (back) cancel(); else release(); return true; }
        var current = selection; if (current == null) return false;
        if (back) { if (current.samples.isEmpty()) selection = null; else current.samples.removeLast(); return true; }
        var sample = sample(current, firstAim); if (sample == null) return true;
        current.samples.add(sample);
        if (current.samples.size() == CompanionInput.state().skills().get(current.slot).preview().input().steps().size()) {
            var aim = current.aim;
            if (CompanionInput.state().skills().get(current.slot).kind().equals("point")) aim = new CompanionInput.Aim(dev.worldcombat.cobblemon.network.ControlCommand.NONE, aim.point(), aim.direction(), aim.origin(), aim.end(), aim.reason());
            CompanionInput.submit("cast", current.slot, aim, current.version, payload(current)); selection = null;
        }
        return true;
    }
    public static void tick(boolean inGame, long tick) {
        if (!active()) return;
        if (!inGame || CompanionInput.actor() == null) { cancel(); return; }
        var current = sustained;
        if (current != null) {
            if (!current.menu && !CompanionInput.physicallyDown(current.held)) { release(); return; }
            current.samples.clear(); var sample = sample(current);
            if (sample == null) { stopSustained(); return; }
            current.samples.add(sample);
            String input = payload(current);
            if (!input.equals(current.lastInput) || tick - current.lastInputTick >= 5) {
                CompanionInput.submit("input-update", current.slot, current.aim, Long.toString(current.token), input);
                current.lastInput = input; current.lastInputTick = tick;
            }
        }
    }
    private static JsonObject sample(Session current) { return sample(current, null); }
    private static JsonObject sample(Session current, CompanionInput.Aim suppliedAim) {
        var lastAim = current.aim = suppliedAim != null ? suppliedAim : CompanionInput.aim(current.slot);
        if (lastAim == null || !lastAim.reason().isEmpty() && !lastAim.reason().equals("out-of-range") && !lastAim.reason().equals("path-blocked") && !(current.channel && lastAim.reason().equals("no-pp"))) { CompanionInput.notifyReason(lastAim == null ? "invalid-target" : lastAim.reason()); return null; }
        var spec = CompanionInput.state().skills().get(current.slot).preview().input(); String kind = spec.steps().get(current.channel ? 0 : current.samples.size());
        var result = new JsonObject(); result.addProperty("kind", kind);
        var point = new JsonArray(); point.add(lastAim.point().x()); point.add(lastAim.point().y()); point.add(lastAim.point().z()); result.add("point", point);
        if (kind.equals("entity")) {
            var refs = JsonParser.parseString(CompanionInput.state().references()).getAsJsonObject();
            var ref = refs.get(lastAim.target().toString()); if (ref == null) { CompanionInput.notifyReason("invalid-target"); return null; }
            result.add("ref", ref);
        } else if (kind.equals("field")) {
            JsonObject best = null; double nearest = Double.MAX_VALUE;
            for (var entry : JsonParser.parseString(ClientPresentation.snapshot()).getAsJsonArray()) {
                var value = entry.getAsJsonObject(); var data = value.getAsJsonObject("data");
                if (!data.has("selectable") || !data.get("selectable").getAsBoolean() || !data.has("effect")) continue;
                var p = value.getAsJsonArray("position");
                double distance = lastAim.end().distanceToSqr(p.get(0).getAsDouble(), p.get(1).getAsDouble(), p.get(2).getAsDouble());
                double radius = data.has("radius") ? data.get("radius").getAsDouble() : 1;
                if (distance <= (radius + 1)*(radius + 1) && distance < nearest) { best = value; nearest = distance; }
            }
            if (best == null) { CompanionInput.notifyReason("choose-field"); return null; }
            result.add("ref", best.get("source")); result.add("effect", best.getAsJsonObject("data").get("effect")); result.add("point", best.get("position"));
        }
        return result;
    }
    private static String payload(Session current) {
        var data = new JsonObject(); data.addProperty("version", 1); data.addProperty("token", current.token);
        var values = new JsonArray(); current.samples.forEach(values::add); data.add("samples", values); return data.toString();
    }
    public static String scene() {
        if (!active()) return "[]";
        var current = focus();
        var aim = CompanionInput.aim(current.slot); if (aim == null) return "[]";
        var points = new JsonArray(); current.samples.forEach(sample -> points.add(sample.get("point")));
        var next = new JsonArray(); next.add(aim.point().x()); next.add(aim.point().y()); next.add(aim.point().z()); points.add(next);
        var data = new JsonObject(); data.add("points", points); data.addProperty("valid", aim.reason().isEmpty());
        var entry = new JsonObject(); entry.addProperty("type", "world_combat:selection"); entry.addProperty("version", 1); entry.add("data", data);
        var scene = new JsonArray(); scene.add(entry); return scene.toString();
    }
}
