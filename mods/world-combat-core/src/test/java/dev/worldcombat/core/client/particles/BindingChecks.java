package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;

/** Payload-to-parser-to-spawn checks using neutral numeric fixtures and an in-memory sink. */
public final class BindingChecks {
    private BindingChecks() {}

    public static void main(String[] args) {
        checkConsumers();
        checkValidation();
        checkFractionalTiming();
        checkUpdatePreservesSchedule();
        checkDurationUpdate();
        checkIndependentInstances();
        System.out.println("BindingChecks PASS");
    }

    private static final String NUMERIC = """
        {"moments":{"main":{"duration":{"data":"window","fallback":0},"emitters":[{
          "name":"sample","particle":"test:scalar","bind":"point",
          "offset":[{"data":"offset.0","fallback":0},0,0],
          "burst":{"count":{"data":"quantity","fallback":0}},
          "shape":{"kind":"ring","radius":{"data":"radius","fallback":1}},
          "direction":"up","speed":{"data":"motion.speed","fallback":0},
          "lifetime":{"data":"life","fallback":1},
          "size":[{"data":"size.begin","fallback":1},{"data":"size.end","fallback":1}],
          "alpha":{"data":"alpha","fallback":1},"color":{"data":"rgb","fallback":16777215},
          "gravity":{"data":"motion.gravity","fallback":0},"drag":{"data":"motion.drag","fallback":1},
          "spin":{"data":"motion.spin","fallback":0},"deflection":[{"data":"motion.x","fallback":0},0],
          "collision":{"bounces":{"data":"collisions","fallback":0}},
          "child":{"lifetime":{"data":"childLife","fallback":1}}
        }]}}}
        """;

    private static void checkConsumers() {
        var definition = parse(NUMERIC);
        check(definition.moment("main").emitters().getFirst().burst().count() == 0, "registration validates fallbacks");
        var entry = entry("""
            {"quantity":3,"radius":4,"offset":[2],"life":13,"size":{"begin":0.4,"end":0.2},
             "alpha":0.5,"rgb":1193046,"motion":{"speed":0.75,"gravity":0.08,"drag":0.9,"spin":45,"x":0.02},
             "collisions":2,"childLife":6}
            """);
        var instance = instance(definition, entry);
        List<ParticleState> spawns = new ArrayList<>();
        instance.tick(1, 1, null, (emitter, state) -> {
            spawns.add(state);
            var spec = emitter.spec();
            near(0.2, spec.sizeEnd(), "bound size end reaches sink");
            near(0.08, spec.gravity(), "bound gravity reaches sink");
            near(0.9, spec.drag(), "bound drag reaches sink");
            near(0.02, spec.deflection().x, "bound deflection reaches sink");
            check(spec.collision().bounces() == 2, "bound collision count reaches sink");
            check(spec.child().lifetime() == 6, "nested child binding reaches sink");
        });
        check(spawns.size() == 3, "finite burst consumes payload quantity without a rate approximation");
        for (var state : spawns) {
            near(4, Math.hypot(state.position.x - 2, state.position.z), "bound ring radius and vector offset");
            near(0.75, state.velocity.y, "bound speed");
            check(state.lifetime == 13, "bound lifetime");
            near(0.4, state.size, "bound size begin");
            near(0.5, state.alpha, "bound alpha");
            near(45, state.spin, "bound spin");
            check(state.color == 0xFF123456, "bound packed RGB");
        }
        for (int tick = 2; tick <= 8; tick++) instance.tick(tick, 1, null, (emitter, state) -> spawns.add(state));
        check(spawns.size() == 3, "one-shot count stays finite while entry remains live");
    }

    private static void checkValidation() {
        var definition = parse(NUMERIC);
        var fallback = definition.resolve(json("{\"quantity\":null}"));
        check(fallback.moment("main").emitters().getFirst().burst().count() == 0, "null uses fallback");
        check(definition.resolve(json("{\"quantity\":1.5}")).moment("main").emitters().getFirst().burst().count() == 2,
            "a script-fractional bound count rounds to the nearest integer");
        rejects(() -> definition.resolve(json("{\"quantity\":-0.5}")), ".burst.count", "negative bound count is still rejected");
        rejects(() -> definition.resolve(json("{\"quantity\":\"3\"}")), ".burst.count", "string is not a numeric binding");
        rejects(() -> definition.resolve(json("{\"alpha\":2}")), ".alpha", "destination range remains enforced");
        rejects(() -> definition.resolve(json("{\"rgb\":1.5}")), ".color", "packed color remains an integer");
        rejects(() -> definition.resolve(json("{\"motion\":false}")), ".speed", "invalid nested container rejected");
        JsonObject invalid = json("{}");
        invalid.addProperty("life", Double.POSITIVE_INFINITY);
        rejects(() -> definition.resolve(invalid), ".lifetime", "non-finite payload rejected");
        rejects(() -> parse(NUMERIC.replace("\"fallback\":0", "\"unused\":0")), "numeric binding", "unknown binding key rejected");
        rejects(() -> parse(NUMERIC.replace("\"quantity\"", "\"quantity..value\"")), ".data", "empty field segment rejected");
        rejects(() -> parse(NUMERIC.replace("\"data\":\"quantity\",\"fallback\":0", "\"data\":\"quantity\",\"fallback\":-1")),
            ".burst.count", "fallback goes through the same parser");
    }

    private static void checkFractionalTiming() {
        var definition = parse(NUMERIC).resolve(json("{\"quantity\":2.4,\"window\":9.6,\"life\":10.6,\"collisions\":2.8,\"childLife\":6.6}"));
        var moment = definition.moment("main");
        var emitter = moment.emitters().getFirst();
        check(moment.duration() == 10 && emitter.burst().count() == 2, "bound timing/count share nearest-integer semantics");
        check(emitter.child().lifetime() == 7, "nested child binding keeps its complete destination path");
        rejects(() -> parse("{\"moments\":{\"main\":{\"emitters\":[{\"name\":\"static\",\"particle\":\"test:scalar\",\"bind\":\"point\",\"burst\":{\"count\":1.5}}]}}}"),
            ".burst.count", "unbound authored fractional counts remain a definition error");
    }

    private static void checkUpdatePreservesSchedule() {
        var definition = parse("""
            {"moments":{"main":{"emitters":[{"name":"sample","particle":"test:scalar","bind":"point",
            "rate":{"data":"rate","fallback":0},"burst":{"count":{"data":"quantity","fallback":0}},
            "lifetime":{"data":"life","fallback":1},"size":1}]}}}
            """);
        var first = entry("{\"rate\":10,\"quantity\":2,\"life\":20}");
        var instance = instance(definition, first);
        var emitter = instance.emitters().getFirst();
        List<ParticleState> spawns = new ArrayList<>();
        ParticleSink sink = (runtime, state) -> spawns.add(state);
        instance.tick(1, 1, null, sink);
        check(spawns.size() == 2, "initial burst plus fractional rate carry");
        instance.touch(entry("{\"rate\":30,\"quantity\":8,\"life\":4}"), 1);
        check(emitter == instance.emitters().getFirst(), "payload update retains emitter identity");
        instance.tick(2, 1, null, sink);
        check(spawns.size() == 4, "rate accumulator is retained and elapsed burst is not replayed");
        check(spawns.getLast().lifetime == 4 && spawns.getFirst().lifetime == 20, "only future lifetimes change");
        instance.release("test");
        instance.touch(first, 2);
        instance.tick(3, 1, null, sink);
        check(spawns.size() == 4, "payload updates cannot restart a released instance");
    }

    private static void checkDurationUpdate() {
        var instance = instance(parse(NUMERIC), entry("{\"quantity\":1,\"life\":1}"));
        instance.tick(1, 1, null, ParticleSink.NONE);
        instance.tick(2, 1, null, ParticleSink.NONE);
        instance.touch(entry("{\"quantity\":1,\"window\":2}"), 2);
        instance.tick(3, 1, null, ParticleSink.NONE);
        check(instance.phase() == ParticleInstance.Phase.EXITING, "updated duration uses original moment clock");
    }

    private static void checkIndependentInstances() {
        var definition = parse(NUMERIC);
        var first = instance(definition, entry("{\"quantity\":2}"));
        var second = instance(definition, entry("{\"quantity\":5}"));
        List<ParticleState> a = new ArrayList<>(), b = new ArrayList<>();
        first.tick(1, 1, null, (emitter, state) -> a.add(state));
        second.tick(1, 1, null, (emitter, state) -> b.add(state));
        check(a.size() == 2 && b.size() == 5, "shared authored definition keeps per-instance bindings independent");
        check(definition.moment("main").emitters().getFirst().burst().count() == 0, "author defaults remain immutable");
    }

    private static ParticleDefinition parse(String definition) { return DefinitionParser.parse("test:bindings", 1, json(definition)); }
    private static JsonObject json(String text) { return JsonParser.parseString(text).getAsJsonObject(); }
    private static JsonObject entry(String data) {
        JsonObject entry = json("{\"key\":\"test/bindings\",\"position\":[0,0,0]}");
        entry.add("data", json(data));
        return entry;
    }
    private static ParticleInstance instance(ParticleDefinition definition, JsonObject entry) {
        return new ParticleInstance("test/bindings", definition, entry, (id, error) -> { throw new AssertionError(error); });
    }
    private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    private static void near(double expected, double actual, String message) {
        check(Double.isFinite(actual) && Math.abs(expected - actual) < 1e-5, message + ": " + actual);
    }
    private static void rejects(Runnable action, String fragment, String message) {
        try { action.run(); }
        catch (IllegalArgumentException error) { check(error.getMessage().contains(fragment), message + ": " + error); return; }
        throw new AssertionError(message);
    }
}
