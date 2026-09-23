package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.joml.Vector3d;

/**
 * Pure-logic checks for the emitter-v2 module: {@link EmitterSchedule} scheduling and the
 * spawn-only {@link EmitterRuntime}. Definitions are built through {@link DefinitionParser} so the
 * checks exercise the real authored format; an in-memory {@link ParticleSink} collects the
 * spawn-time states. Runs without Minecraft.
 */
public final class EmitterChecks {
    private EmitterChecks() {}

    private static final double EPS = 1e-6;

    public static void main(String[] args) {
        checkRateAccumulator();
        checkBurst();
        checkZeroAndScaledEmission();
        checkWindow();
        checkStopAndDrain();
        checkHide();
        checkSegmentDistribution();
        checkTrailSpacing();
        checkTrailAnchorLoss();
        checkLifetimeRange();
        checkLifeJitter();
        checkMaxParticles();
        checkBudget();
        checkAmountBudget();
        checkReplay();
        System.out.println("EmitterChecks PASS");
    }

    private static void checkRateAccumulator() {
        var definition = definition(rate(emitter("rate"), 20));
        var rig = new Rig(definition, Anchors.point(0, 0, 0), 1L);
        for (int tick = 0; tick < 20; tick++) rig.tick(1.0);
        assertEquals(20, rig.sink.spawns.size(), "rate 20/s at lod 1 spawns 20 over 20 ticks");

        var half = new Rig(definition, Anchors.point(0, 0, 0), 1L);
        for (int tick = 0; tick < 20; tick++) half.tick(0.5);
        assertEquals(10, half.sink.spawns.size(), "rate 20/s at lod 0.5 spawns 10 over 20 ticks");
    }

    private static void checkBurst() {
        var definition = definition(burst(emitter("burst"), 5, 4, 3));
        var moment = definition.moment("main");
        var schedule = new EmitterSchedule(moment.emitters().get(0), moment);
        assertEquals(5, schedule.spawnCount(0, 1.0), "burst fires at tick 0");
        assertEquals(0, schedule.spawnCount(1, 1.0), "no burst on an off tick");
        assertEquals(0, schedule.spawnCount(3, 1.0), "no burst before interval 4");
        assertEquals(5, schedule.spawnCount(4, 1.0), "burst at tick 4");
        assertEquals(5, schedule.spawnCount(8, 1.0), "burst at tick 8");
        assertEquals(0, schedule.spawnCount(9, 1.0), "no burst after the last repeat");

        var low = new EmitterSchedule(moment.emitters().get(0), moment);
        assertEquals(2, low.spawnCount(0, 0.25), "burst halves when lod < 0.5");
    }

    private static void checkWindow() {
        JsonObject emitter = rate(emitter("window"), 20);
        emitter.addProperty("start", 5);
        emitter.addProperty("stop", 10);
        var definition = definition(emitter);
        var moment = definition.moment("main");
        var schedule = new EmitterSchedule(moment.emitters().get(0), moment);
        assertEquals(10, schedule.stopTick(), "explicit spec.stop wins");
        for (int tick = 0; tick < 5; tick++) {
            assertFalse(schedule.emitting(tick), "window closed before start");
            assertEquals(0, schedule.spawnCount(tick, 1.0), "no spawn before start");
        }
        assertTrue(schedule.emitting(5), "window opens at start");
        assertTrue(schedule.emitting(9), "window open before stop");
        assertEquals(1, schedule.spawnCount(5, 1.0), "spawn inside the window");
        assertEquals(0, schedule.spawnCount(10, 1.0), "no spawn at stop");
        assertFalse(schedule.emitting(10), "window closes at stop");

        JsonObject fallbackEmitter = rate(emitter("fallback"), 20);
        fallbackEmitter.addProperty("stop", 0);
        var fallbackDefinition = definition(7, 7, 0, fallbackEmitter);
        var fallbackMoment = fallbackDefinition.moment("main");
        var fallback = new EmitterSchedule(fallbackMoment.emitters().get(0), fallbackMoment);
        assertEquals(7, fallback.stopTick(), "moment.stop is the fallback stop tick");
        assertEquals(1, fallback.spawnCount(6, 1.0), "spawn before moment.stop");
        assertEquals(0, fallback.spawnCount(7, 1.0), "no spawn at moment.stop");
    }

    private static void checkZeroAndScaledEmission() {
        var definition = definition(burst(emitter("zero"), 0, 1, 1));
        var moment = definition.moment("main");
        var schedule = new EmitterSchedule(moment.emitters().getFirst(), moment);
        assertEquals(0, schedule.spawnCount(0, 0.25), "zero burst remains zero at low quality");
        definition = definition(burst(rate(emitter("scaled"), 20), 4, 1, 1));
        moment = definition.moment("main");
        schedule = new EmitterSchedule(moment.emitters().getFirst(), moment);
        assertEquals(0, schedule.spawnCount(0, 1, 0), "zero intensity suppresses rate and burst");
        assertEquals(0, schedule.spawnCount(0, 0, 1), "zero quality suppresses rate and burst");
        assertEquals(10, schedule.spawnCount(0, 1, 2), "intensity scales both consumers above one");
        assertEquals(2, schedule.spawnCount(1, 1, 2), "continuous rate remains separate from finite burst");

        var high = definition(rate(emitter("high"), Double.MAX_VALUE)).moment("main");
        schedule = new EmitterSchedule(high.emitters().getFirst(), high);
        assertEquals(Integer.MAX_VALUE, schedule.spawnCount(0, 1, Double.MAX_VALUE), "overflowed rate product saturates count");
        var idle = definition(rate(emitter("high"), 0)).moment("main");
        schedule.update(idle.emitters().getFirst(), idle);
        assertEquals(0, schedule.spawnCount(1, 1), "overflow cannot leave an infinite backlog after a payload update");
    }

    private static void checkAmountBudget() {
        var spec = burst(emitter("copies"), 10, 1, 1);
        spec.addProperty("amount", 3);
        spec.addProperty("maxParticles", 5);
        var rig = new Rig(definition(spec), Anchors.point(0, 0, 0), 1L);
        rig.tick();
        assertEquals(1, rig.sink.spawns.size(), "a spawn batch fits in full or is skipped");
        assertEquals(3, rig.emitter.particleCount(), "all copies count toward emitter cap");
        assertEquals(3, rig.budget.live(), "spawn copies immediately consume global budget");
        spec.remove("maxParticles");
        rig = new Rig(definition(spec), Anchors.point(0, 0, 0), 1L);
        rig.budget.add(ParticleBudget.GLOBAL_LIMIT - 4);
        rig.tick();
        assertEquals(1, rig.sink.spawns.size(), "multiple batches cannot exceed remaining global capacity in one tick");
    }

    private static void checkStopAndDrain() {
        JsonObject emitter = rate(emitter("drain"), 20);
        emitter.addProperty("lifetime", 2);
        var definition = definition(0, 0, 2, emitter);
        var rig = new Rig(definition, Anchors.point(0, 0, 0), 5L);
        rig.tick();
        rig.tick();
        rig.tick();
        assertEquals(3, rig.sink.spawns.size(), "one particle per tick before stop");
        assertTrue(rig.emitter.alive(), "alive while emitting");

        rig.emitter.stop();
        rig.tick();
        assertEquals(3, rig.sink.spawns.size(), "stop halts spawning");
        assertTrue(rig.emitter.alive(), "drain window still open at tick 3");
        rig.tick();
        assertTrue(rig.emitter.alive(), "drain window still open at tick 4");
        rig.tick();
        assertFalse(rig.emitter.alive(), "finished after the last survivor and the drain window");
    }

    private static void checkHide() {
        JsonObject emitter = rate(emitter("hide"), 20);
        emitter.addProperty("lifetime", 1000);
        var rig = new Rig(definition(emitter), Anchors.point(0, 0, 0), 9L);
        rig.tick();
        rig.tick();
        rig.tick();
        assertEquals(3, rig.sink.spawns.size(), "three spawns before hide");
        assertEquals(3, rig.emitter.particleCount(), "estimated survival counts the spawns");

        rig.emitter.hide();
        assertEquals(0, rig.emitter.particleCount(), "hide drops the survival estimate immediately");
        assertFalse(rig.emitter.alive(), "hidden emitter is not alive");
        rig.tick();
        rig.tick();
        assertEquals(3, rig.sink.spawns.size(), "hidden emitter spawns nothing");
    }

    private static void checkSegmentDistribution() {
        JsonObject emitter = rate(emitter("segment"), 200);
        emitter.addProperty("lifetime", 1000);
        var anchor = new MutableAnchor(0, 0, 0);
        var rig = new Rig(definition(emitter), anchor, 11L);
        rig.tick();
        assertEquals(10, rig.sink.spawns.size(), "high rate yields ten spawns on the first tick");

        anchor.set(10, 0, 0);
        rig.sink.clear();
        rig.tick();
        assertEquals(10, rig.sink.spawns.size(), "ten spawns on a moving tick");
        double previousX = Double.NEGATIVE_INFINITY;
        for (Spawn spawn : rig.sink.spawns) {
            assertTrue(spawn.x() >= -EPS && spawn.x() <= 10 + EPS, "spawn x within the segment: " + spawn.x());
            assertTrue(spawn.x() > previousX, "spawn x ascends along the segment: " + spawn.x());
            previousX = spawn.x();
        }
    }

    private static void checkTrailSpacing() {
        JsonObject emitter = emitter("trail");
        JsonObject trail = new JsonObject();
        trail.addProperty("minDistance", 0.5);
        emitter.add("trail", trail);
        emitter.addProperty("rate", 20);
        emitter.addProperty("lifetime", 1000);
        var anchor = new MutableAnchor(0, 0, 0);
        var rig = new Rig(definition(emitter), anchor, 13L);
        rig.tick();
        assertEquals(0, rig.sink.spawns.size(), "first trail tick has no previous point");
        rig.sink.clear();

        for (int step = 1; step <= 4; step++) {
            anchor.set(step * 2.0, 0, 0);
            rig.tick();
        }
        assertEquals(16, rig.sink.spawns.size(), "2 blocks/tick at minDistance 0.5 yields four per tick");
        for (int i = 1; i < rig.sink.spawns.size(); i++) {
            double gap = rig.sink.spawns.get(i).x() - rig.sink.spawns.get(i - 1).x();
            assertNear(0.5, gap, 1e-6, "trail particles are equally spaced at index " + i);
        }
    }

    private static void checkLifetimeRange() {
        JsonObject emitter = rate(emitter("lifetime"), 200);
        JsonArray range = new JsonArray();
        range.add(3);
        range.add(7);
        emitter.add("lifetime", range);
        var rig = new Rig(definition(emitter), Anchors.point(0, 0, 0), 15L);
        for (int tick = 0; tick < 5; tick++) rig.tick();
        assertTrue(rig.sink.spawns.size() > 0, "lifetime range sampled some particles");
        boolean belowMean = false;
        boolean aboveMean = false;
        for (Spawn spawn : rig.sink.spawns) {
            assertTrue(spawn.lifetime() >= 3 && spawn.lifetime() <= 7, "lifetime in [3, 7], got " + spawn.lifetime());
            if (spawn.lifetime() < 5) belowMean = true;
            if (spawn.lifetime() > 5) aboveMean = true;
        }
        assertTrue(belowMean && aboveMean, "lifetime range produced values on both sides of the mean");
    }

    private static void checkTrailAnchorLoss() {
        JsonObject emitter = rate(emitter("lost-anchor"), 20);
        JsonObject trail = new JsonObject();
        trail.addProperty("minDistance", 0.5);
        emitter.add("trail", trail);
        emitter.addProperty("lifetime", 2);
        var anchor = new MutableAnchor(0, 0, 0);
        var rig = new Rig(definition(emitter), anchor, 17L);
        rig.tick();
        anchor.set(2, 0, 0);
        rig.tick();
        assertEquals(4, rig.sink.spawns.size(), "the observed segment emits once");
        anchor.available = false;
        rig.sink.clear();
        for (int tick = 0; tick < 6; tick++) rig.tick();
        assertEquals(0, rig.sink.spawns.size(), "missing anchor cannot replay the last segment");
        assertEquals(0, rig.emitter.particleCount(), "existing trail particles drain after anchor loss");
        anchor.available = true;
        anchor.set(10, 0, 0);
        rig.tick();
        assertEquals(0, rig.sink.spawns.size(), "reappearing anchor does not bridge an unobserved gap");
        anchor.set(11, 0, 0);
        rig.tick();
        assertEquals(2, rig.sink.spawns.size(), "fresh consecutive observations resume the trail");
        rig.sink.clear();
        rig.tick();
        assertEquals(0, rig.sink.spawns.size(), "stationary anchor emits no distance trail");

        var heldAnchor = new MutableAnchor(3, 4, 5);
        var held = new Rig(definition(rate(emitter("held-point"), 20)), heldAnchor, 18L);
        held.tick();
        heldAnchor.available = false;
        held.tick();
        assertEquals(2, held.sink.spawns.size(), "ordinary emitter retains the last point until owner release");
        assertNear(3, held.sink.spawns.getLast().x(), EPS, "held emission stays at the last observed point");
    }

    private static void checkLifeJitter() {
        JsonObject plain = emitter("jitter0");
        plain.addProperty("lifetime", 10);
        burst(plain, 50, 1, 1);
        var plainRig = new Rig(definition(plain), Anchors.point(0, 0, 0), 21L);
        for (int tick = 0; tick < 11; tick++) plainRig.tick();
        assertEquals(0, plainRig.emitter.particleCount(), "without jitter all particles are gone by tick 10");

        JsonObject jittered = emitter("jitter100");
        jittered.addProperty("lifetime", 10);
        jittered.addProperty("lifeJitter", 100);
        burst(jittered, 50, 1, 1);
        var jitterRig = new Rig(definition(jittered), Anchors.point(0, 0, 0), 21L);
        for (int tick = 0; tick < 11; tick++) jitterRig.tick();
        assertTrue(jitterRig.emitter.particleCount() > 0, "lifeJitter pushes the estimated death past the base lifetime");
        for (int tick = 11; tick < 21; tick++) jitterRig.tick();
        assertEquals(0, jitterRig.emitter.particleCount(), "jittered particles are gone by lifetime * 2");
    }

    private static void checkMaxParticles() {
        JsonObject emitter = rate(emitter("capped"), 200);
        emitter.addProperty("lifetime", 1000);
        emitter.addProperty("maxParticles", 3);
        var rig = new Rig(definition(emitter), Anchors.point(0, 0, 0), 25L);
        for (int tick = 0; tick < 10; tick++) rig.tick();
        assertEquals(3, rig.emitter.particleCount(), "maxParticles caps the estimated survival");
        assertEquals(3, rig.sink.spawns.size(), "spawning stops at maxParticles");
    }

    private static void checkBudget() {
        JsonObject emitter = rate(emitter("budget"), 20);
        emitter.addProperty("lifetime", 1000);
        var rig = new Rig(definition(emitter), Anchors.point(0, 0, 0), 27L);
        rig.budget.add(ParticleBudget.GLOBAL_LIMIT);
        rig.tick();
        rig.tick();
        assertEquals(0, rig.emitter.particleCount(), "an exhausted global budget blocks spawning");
        assertEquals(0, rig.sink.spawns.size(), "no states are handed to the sink under an exhausted budget");
    }

    private static void checkReplay() {
        JsonObject emitter = rate(emitter("replay"), 40);
        JsonArray size = new JsonArray();
        size.add(0.5);
        size.add(1.5);
        emitter.add("size", size);
        JsonArray lifetime = new JsonArray();
        lifetime.add(3);
        lifetime.add(6);
        emitter.add("lifetime", lifetime);
        JsonArray speed = new JsonArray();
        speed.add(0.1);
        speed.add(0.5);
        emitter.add("speed", speed);
        emitter.addProperty("spread", 30);
        var definition = definition(emitter);

        var anchorA = new MutableAnchor(0, 0, 0);
        var anchorB = new MutableAnchor(0, 0, 0);
        var first = new Rig(definition, anchorA, 12345L);
        var second = new Rig(definition, anchorB, 12345L);
        for (int tick = 0; tick < 20; tick++) {
            double x = tick * 0.5;
            anchorA.set(x, 0, 0);
            anchorB.set(x, 0, 0);
            first.tick();
            second.tick();
        }
        assertEquals(first.sink.spawns.size(), second.sink.spawns.size(), "same seed spawns the same count");
        for (int i = 0; i < first.sink.spawns.size(); i++) {
            Spawn a = first.sink.spawns.get(i);
            Spawn b = second.sink.spawns.get(i);
            if (a.random() != b.random() || a.lifetime() != b.lifetime()) throw new AssertionError("replay diverged at spawn " + i);
            assertNear(a.x(), b.x(), 0, "replay x at spawn " + i);
            assertNear(a.y(), b.y(), 0, "replay y at spawn " + i);
            assertNear(a.z(), b.z(), 0, "replay z at spawn " + i);
            assertNear(a.vx(), b.vx(), 0, "replay vx at spawn " + i);
            assertNear(a.vy(), b.vy(), 0, "replay vy at spawn " + i);
            assertNear(a.vz(), b.vz(), 0, "replay vz at spawn " + i);
            assertNear(a.size(), b.size(), 0, "replay size at spawn " + i);
            assertNear(a.alpha(), b.alpha(), 0, "replay alpha at spawn " + i);
            assertNear(a.roll(), b.roll(), 0, "replay roll at spawn " + i);
            assertNear(a.spin(), b.spin(), 0, "replay spin at spawn " + i);
            if (a.color() != b.color()) throw new AssertionError("replay colour diverged at spawn " + i);
        }
    }

    // --- authored-definition helpers -----------------------------------------------------------

    private static JsonObject emitter(String name) {
        JsonObject emitter = new JsonObject();
        emitter.addProperty("name", name);
        emitter.addProperty("particle", "test:texture");
        emitter.addProperty("lifetime", 5);
        emitter.addProperty("size", 0.1);
        return emitter;
    }

    private static JsonObject rate(JsonObject emitter, double rate) {
        emitter.addProperty("rate", rate);
        return emitter;
    }

    private static JsonObject burst(JsonObject emitter, int count, int interval, int repeats) {
        JsonObject burst = new JsonObject();
        burst.addProperty("count", count);
        burst.addProperty("interval", interval);
        burst.addProperty("repeats", repeats);
        emitter.add("burst", burst);
        return emitter;
    }

    private static ParticleDefinition definition(JsonObject... emitters) {
        return definition(40, 40, 5, emitters);
    }

    private static ParticleDefinition definition(int duration, int stop, int drain, JsonObject... emitters) {
        JsonObject exit = new JsonObject();
        exit.addProperty("stop", stop);
        exit.addProperty("drain", drain);
        JsonObject moment = new JsonObject();
        moment.addProperty("duration", duration);
        moment.add("exit", exit);
        JsonArray emitterArray = new JsonArray();
        for (JsonObject emitter : emitters) emitterArray.add(emitter);
        moment.add("emitters", emitterArray);
        JsonObject moments = new JsonObject();
        moments.add("main", moment);
        JsonObject root = new JsonObject();
        root.add("moments", moments);
        return DefinitionParser.parse("check", 1, root);
    }

    // --- scaffolding ---------------------------------------------------------------------------

    /** A mutable world-point anchor, suitable for driving a moving emitter in checks. */
    private static final class MutableAnchor implements Anchor {
        private double x;
        private double y;
        private double z;
        private boolean available = true;

        MutableAnchor(double x, double y, double z) { set(x, y, z); }

        void set(double x, double y, double z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        @Override
        public boolean resolve(float partialTick, Vector3d out) {
            if (!available) return false;
            out.set(x, y, z);
            return true;
        }

        @Override
        public double height() { return 0; }

        @Override
        public boolean valid() { return available; }
    }

    /** In-memory sink capturing the spawn-time snapshot for later assertions. */
    private static final class CollectingSink implements ParticleSink {
        final List<Spawn> spawns = new ArrayList<>();

        @Override
        public void spawn(EmitterRuntime emitter, ParticleState state) {
            spawns.add(new Spawn(state.position.x, state.position.y, state.position.z,
                state.velocity.x, state.velocity.y, state.velocity.z, state.lifetime, state.random,
                state.size, state.alpha, state.color, state.roll, state.spin));
        }

        void clear() { spawns.clear(); }
    }

    private record Spawn(double x, double y, double z, double vx, double vy, double vz,
                         int lifetime, double random, float size, float alpha, int color, float roll, float spin) {}

    /** Drives one emitter through successive client ticks. */
    private static final class Rig {
        final EmitterRuntime emitter;
        final CollectingSink sink = new CollectingSink();
        final ParticleInstance instance;
        final ParticleBudget budget = new ParticleBudget();
        long tick;

        Rig(ParticleDefinition definition, Anchor anchor, long seed) {
            var moment = definition.moment("main");
            this.emitter = new EmitterRuntime(0, moment.emitters().get(0), moment, seed, anchor);
            this.instance = new ParticleInstance("check", definition, seed);
        }

        void tick() { tick(1.0); }

        void tick(double lod) {
            Function<ParticleDefinition.Bind, Anchor> anchors = bind -> emitter.anchor();
            emitter.tick(new ParticleInstance.InstanceContext(tick++, lod, budget, instance, sink, anchors));
        }
    }

    // --- assertions ----------------------------------------------------------------------------

    private static void assertTrue(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void assertFalse(boolean condition, String message) {
        if (condition) throw new AssertionError(message);
    }

    private static void assertEquals(long expected, long actual, String message) {
        if (expected != actual) throw new AssertionError(message + " (expected " + expected + " but got " + actual + ")");
    }

    private static void assertNear(double expected, double actual, double tolerance, String message) {
        if (Math.abs(expected - actual) > tolerance)
            throw new AssertionError(message + " (expected " + expected + " but got " + actual + ")");
    }
}
