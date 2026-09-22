package dev.worldcombat.core.runtime;

import com.google.gson.*;
import java.util.*;

/** Generic versioned selections, shared by manual and script-generated actions. */
public final class ActionInput {
    public static final String KEY = "world_combat:input";
    public record Spec(List<String> steps, boolean sustained) {
        public static Spec parse(JsonObject preview) {
            if (!preview.has("input")) return new Spec(List.of(), false);
            var input = preview.getAsJsonObject("input");
            if (input.get("version").getAsInt() != 1) throw new IllegalArgumentException("Unsupported input schema");
            var steps = new ArrayList<String>();
            for (var step : input.getAsJsonArray("steps")) {
                String kind = step.getAsString();
                if (!List.of("point", "entity", "field").contains(kind) || steps.size() >= 8) throw new IllegalArgumentException("Invalid selection steps");
                steps.add(kind);
            }
            boolean sustained = input.has("sustained") && input.get("sustained").getAsBoolean();
            if (steps.isEmpty() || sustained && steps.size() != 1) throw new IllegalArgumentException("Invalid input contract");
            return new Spec(List.copyOf(steps), sustained);
        }
    }
    public record Sample(String kind, Point point, String ref, long effect) {}
    public record Value(long token, List<Sample> samples, String json) {}
    public static Value parse(String json, Spec spec) {
        try {
            if (spec.steps.isEmpty()) {
                if (json != null && !json.equals("{}")) throw new IllegalArgumentException("Unrequested input");
                return new Value(0, List.of(), "{}");
            }
            if (json == null) throw new IllegalArgumentException("Input JSON is required");
            var object = JsonParser.parseString(dev.worldcombat.core.runtime.effect.EffectData.copy(json)).getAsJsonObject();
            if (integer(object.get("version")) != 1) throw new IllegalArgumentException("Input version mismatch");
            long token = integer(object.get("token"));
            if (token < 0 || token > 9007199254740991L) throw new IllegalArgumentException("Invalid input token");
            var samples = new ArrayList<Sample>(); var data = object.getAsJsonArray("samples");
            if (data.size() != spec.steps.size()) throw new IllegalArgumentException("Wrong number of selections");
            for (int i = 0; i < data.size(); i++) {
                var value = data.get(i).getAsJsonObject(); var point = value.getAsJsonArray("point");
                String kind = value.get("kind").getAsString(), ref = value.has("ref") ? value.get("ref").getAsString() : "";
                long effect = value.has("effect") ? integer(value.get("effect")) : 0;
                if (!kind.equals(spec.steps.get(i)) || point.size() != 3 || ref.length() > 80 || effect < 0) throw new IllegalArgumentException("Invalid selection");
                Point p = new Point(point.get(0).getAsDouble(), point.get(1).getAsDouble(), point.get(2).getAsDouble());
                if (!Double.isFinite(p.length()) || (!kind.equals("point") && !ref.matches("[0-9a-f-]{36}/[0-9]+")) || kind.equals("field") && effect == 0) throw new IllegalArgumentException("Invalid reference");
                if (!kind.equals("point")) {
                    var parts = ref.split("/"); UUID.fromString(parts[0]);
                    if (Long.parseLong(parts[1]) < 1) throw new IllegalArgumentException("Invalid generation");
                }
                samples.add(new Sample(kind, p, ref, effect));
            }
            return new Value(token, List.copyOf(samples), object.toString());
        } catch (RuntimeException malformed) { throw new ActionRejectedException("invalid-input"); }
    }
    private static long integer(JsonElement value) {
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException("Integer required");
        return value.getAsBigDecimal().longValueExact();
    }
    /**
     * A cast that carries no selections (scripts, companions) still names a target; the declared steps take that target
     * as their single sample so an input contract written for manual aiming stays castable by everyone. Field steps
     * need a real selection and are left to the normal rejection.
     */
    public static String implied(String json, Spec spec, ActionTarget target, ActorHandle actor, CombatHost host) {
        if (spec.steps.isEmpty() || json != null && !json.equals("{}")) return json;
        var samples = new JsonArray();
        for (var kind : spec.steps) {
            var sample = new JsonObject(); sample.addProperty("kind", kind);
            Point point = target.kind().equals("direction") ? host.position(actor).plus(target.direction()) : target.point();
            var coordinates = new JsonArray(); coordinates.add(point.x()); coordinates.add(point.y()); coordinates.add(point.z());
            sample.add("point", coordinates);
            if (kind.equals("entity")) { if (target.entity() == null) return json; sample.addProperty("ref", target.entity().ref()); }
            if (kind.equals("field")) return json;
            samples.add(sample);
        }
        var object = new JsonObject(); object.addProperty("version", 1); object.addProperty("token", 0); object.add("samples", samples);
        return object.toString();
    }
    public static Value validate(String json, Spec spec, double range, ActorHandle actor, CombatHost host, dev.worldcombat.core.runtime.effect.EffectRuntime effects) {
        var value = parse(json, spec);
        for (var sample : value.samples) {
            if (sample.point.minus(host.position(actor)).length() > range) throw new ActionRejectedException("out-of-range");
            if (!sample.kind.equals("point")) {
                var parts = sample.ref.split("/"); var target = host.actorNear(actor, UUID.fromString(parts[0]));
                if (target == null || !host.sameWorld(actor, target) || target.generation() != Long.parseLong(parts[1])) throw new ActionRejectedException("target-left");
                if (host.position(target).minus(host.position(actor)).length() > range) throw new ActionRejectedException("out-of-range");
                if (sample.kind.equals("field") && Arrays.stream(effects.query(target, "")).noneMatch(e -> e.id() == sample.effect)) throw new ActionRejectedException("field-left");
            }
        }
        return value;
    }
}
