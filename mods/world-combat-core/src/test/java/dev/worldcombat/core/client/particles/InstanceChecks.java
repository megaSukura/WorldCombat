package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;
import org.joml.Vector3d;

/**
 * Pure-logic checks for the director-v2 module: {@link ParticleInstance}, {@link ParticleDirector}
 * wiring pieces and {@link ParticleBudget}. Runs without Minecraft using in-memory sinks and point
 * anchors, so no entity bindings are exercised.
 */
public final class InstanceChecks {
    private InstanceChecks() {}

    private static final double EPS = 1e-6;

    public static void main(String[] args) {
        checkCreatedRunning();
        checkSpawns();
        checkScaleAndTint();
        checkReleaseToDone();
        checkInterruptHide();
        checkSwitchMoment();
        checkUnknownMoment();
        checkEventChildOnce();
        checkBirthChild();
        checkDurationRelease();
        checkIntensity();
        checkLifecycleRelease();
        checkEnvelopeLifecycleRelease();
        checkMissingTarget();
        checkReplay();
        checkBudgetRefresh();
        checkPathPolygon();
        checkBatchReplayPath();
        checkPathPolylineFollowsPayload();
        checkOrientDirection();
        checkHorizontalSector();
        checkUpdatedPointAndMoment();
        checkBindingRefresh();
        checkClearedPath();
        checkDegeneratePolygonRecovery();
        checkReleasedMomentStaysReleased();
        System.out.println("InstanceChecks PASS");
    }

    /** A triangle of fixed points: every fill spawn lies inside it, every outline spawn on an edge. */
    private static void checkPathPolygon() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        data.add("path", triangle(0, 0, 0, 6, 0, 0, 0, 0, 6));
        var sim = new Sim(make(PATH_FILL, entry(data, 1)));
        sim.tick(5);
        assertTrue(sim.sink.spawns.size() >= 20, "polygon emitter spawns, got " + sim.sink.spawns.size());
        for (Spawn spawn : sim.sink.spawns) {
            assertTrue(spawn.x() >= -1e-4 && spawn.z() >= -1e-4 && spawn.x() + spawn.z() <= 6 + 1e-4 && Math.abs(spawn.y()) < 1e-4,
                "polygon spawn inside the triangle, got " + spawn.x() + "," + spawn.y() + "," + spawn.z());
        }
        var outline = new Sim(make(PATH_OUTLINE, entry(data, 1)));
        outline.tick(5);
        assertTrue(outline.sink.spawns.size() >= 20, "polyline emitter spawns");
        for (Spawn spawn : outline.sink.spawns) {
            boolean onEdge = Math.abs(spawn.z()) < 1e-3 || Math.abs(spawn.x()) < 1e-3 || Math.abs(spawn.x() + spawn.z() - 6) < 1e-3;
            assertTrue(onEdge, "closed polyline spawn on an edge, got " + spawn.x() + "," + spawn.z());
        }
    }

    /** The author-side replay supplies real geometry for both supported path shapes. */
    private static void checkBatchReplayPath() {
        for (String definition : new String[] { PATH_FILL, PATH_OUTLINE }) {
            var sim = new Sim(make(definition, entry(DefinitionBatchChecks.replayData("main"), 1)));
            sim.tick(5);
            assertTrue(sim.sink.spawns.size() >= 20, "batch replay exercises path emitters");
        }
    }

    /** Moving the payload's vertices moves later spawns; scale never touches path geometry. */
    private static void checkPathPolylineFollowsPayload() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        data.addProperty("scale", 5);
        data.add("path", triangle(0, 0, 0, 2, 0, 0, 0, 0, 2));
        var sim = new Sim(make(PATH_OUTLINE, entry(data, 1)));
        sim.tick(3);
        for (Spawn spawn : sim.sink.spawns) assertTrue(spawn.x() <= 2 + 1e-3 && spawn.z() <= 2 + 1e-3, "scale leaves vertices where they are");
        JsonObject moved = new JsonObject();
        moved.addProperty("seed", seed());
        moved.add("path", triangle(100, 0, 100, 102, 0, 100, 100, 0, 102));
        sim.instance.touch(entry(moved, 1), 4);
        int before = sim.sink.spawns.size();
        sim.tick(3);
        for (int i = before; i < sim.sink.spawns.size(); i++)
            assertTrue(sim.sink.spawns.get(i).x() >= 100 - 1e-3, "spawns follow the updated path, got x=" + sim.sink.spawns.get(i).x());
    }

    /** orient "direction" stands a line along data.direction instead of local +Y. */
    private static void checkOrientDirection() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        JsonArray direction = new JsonArray();
        direction.add(1); direction.add(0); direction.add(0);
        data.add("direction", direction);
        var sim = new Sim(make(ORIENTED_LINE, entry(data, 0)));
        sim.tick(4);
        assertTrue(sim.sink.spawns.size() >= 3, "oriented line spawns");
        for (Spawn spawn : sim.sink.spawns) {
            assertTrue(spawn.x() >= -1e-4 && spawn.x() <= 4 + 1e-4 && Math.abs(spawn.y()) < 1e-4 && Math.abs(spawn.z()) < 1e-4,
                "line runs along +X, got " + spawn.x() + "," + spawn.y() + "," + spawn.z());
        }
    }

    /** Ground geometry shares the server sector's full opening and radius, regardless of pitch or visual scale. */
    private static void checkHorizontalSector() {
        String definition = """
            {"moments":{"main":{"duration":3,"emitters":[
              {"name":"footprint","particle":"minecraft:flame","bind":"point","fit":"world","orient":"heading",
               "shape":{"kind":"sector","radius":4,"angleDegrees":150},"burst":{"count":128},
               "maxParticles":256,"direction":"shape","speed":0.2,"lifetime":8,"size":1}
            ]}}}
            """;
        for (double[] heading : new double[][] { {1, 3, 0}, {-1, -2, 2}, {0, 0, -1}, {0, 1, 0} }) {
            for (double scale : new double[] {0.5, 1, 3}) {
                JsonObject data = new JsonObject(); data.addProperty("seed", seed()); data.addProperty("scale", scale);
                JsonArray direction = new JsonArray(); for (double value : heading) direction.add(value); data.add("direction", direction);
                var sim = new Sim(make(definition, entry(data, 0))); sim.tick();
                assertEquals(128, sim.sink.spawns.size(), "sector emits the authored burst");
                double horizontal = Math.hypot(heading[0], heading[2]);
                double hx = horizontal < EPS ? 0 : heading[0] / horizontal, hz = horizontal < EPS ? 1 : heading[2] / horizontal;
                for (Spawn spawn : sim.sink.spawns) {
                    double radius = Math.hypot(spawn.x(), spawn.z());
                    assertNear(0, spawn.y(), EPS, "pitch leaves ground footprint horizontal");
                    assertTrue(radius <= 4 + EPS, "data.scale preserves the authoritative radius");
                    assertTrue(radius < EPS || (spawn.x() * hx + spawn.z() * hz) / radius >= Math.cos(Math.toRadians(75)) - EPS,
                        "heading and full opening match the server sector");
                    assertNear(0.2, Math.sqrt(spawn.vx() * spawn.vx() + spawn.vy() * spawn.vy() + spawn.vz() * spawn.vz()), EPS,
                        "world fit preserves authored speed");
                }
            }
        }
    }

    private static JsonArray triangle(double... xyz) {
        JsonArray path = new JsonArray();
        for (int i = 0; i < xyz.length; i += 3) {
            JsonArray point = new JsonArray();
            point.add(xyz[i]); point.add(xyz[i + 1]); point.add(xyz[i + 2]);
            path.add(point);
        }
        return path;
    }

    private static void checkUpdatedPointAndMoment() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick();
        var data = new JsonObject();
        data.addProperty("moment", "impact");
        data.add("point", JsonParser.parseString("[30,4,5]"));
        sim.instance.touch(entry(data, 100), 1);
        int before = sim.sink.spawns.size();
        sim.tick();
        assertEquals(3, sim.sink.spawns.size() - before, "new moment burst fires once");
        for (int i = before; i < sim.sink.spawns.size(); i++) {
            assertNear(30, sim.sink.spawns.get(i).x(), EPS, "moment transition reads latest point");
            assertNear(4, sim.sink.spawns.get(i).y(), EPS, "point y updated");
        }
    }

    private static void checkBindingRefresh() {
        var instance = make(TARGET, entry(seed(), 1));
        var data = new JsonObject();
        data.addProperty("target", "00000000-0000-0000-0000-000000000001/entity");
        instance.touch(entry(data, 1), 1);
        assertEquals(1, instance.emitters().size(), "later target reference attaches missing emitter");
        assertTrue(instance.anchors().apply(ParticleDefinition.Bind.TARGET) != null, "target direction binding updated");
        instance.touch(entry(new JsonObject(), 1), 2);
        assertTrue(instance.anchors().apply(ParticleDefinition.Bind.TARGET) == null, "absent target clears binding");
        assertEquals(0, instance.emitters().size(), "missing target retires emitter");
    }

    private static void checkClearedPath() {
        var data = new JsonObject();
        data.add("path", triangle(0, 0, 0, 1, 0, 0));
        var sim = new Sim(make(PATH_FILL, entry(data, 0)));
        sim.tick();
        assertEquals(0, sim.sink.spawns.size(), "polygon needs at least three resolved vertices");
        data.add("path", triangle(0, 0, 0, 1, 0, 0, 0, 0, 1));
        sim.instance.touch(entry(data, 0), 1);
        sim.tick();
        int before = sim.sink.spawns.size();
        assertTrue(before > 0, "valid path starts emission");
        data.add("path", new JsonArray());
        sim.instance.touch(entry(data, 0), 2);
        sim.tick();
        assertEquals(before, sim.sink.spawns.size(), "empty path stops emission from old vertices");
    }

    private static void checkReleasedMomentStaysReleased() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick();
        sim.instance.release("test");
        var data = new JsonObject();
        data.addProperty("moment", "impact");
        sim.instance.touch(entry(data, 1), 1);
        sim.tick();
        assertEquals(1, sim.sink.spawns.size(), "released entry cannot create a new emitting moment");
    }

    private static void checkDegeneratePolygonRecovery() {
        var definition = JsonParser.parseString(PATH_FILL).getAsJsonObject();
        var emitter = definition.getAsJsonObject("moments").getAsJsonObject("main").getAsJsonArray("emitters").get(0).getAsJsonObject();
        emitter.add("offset", JsonParser.parseString("[3,2,7]"));
        var data = new JsonObject();
        data.addProperty("scale", 9);
        data.add("path", triangle(0,0,0, 1,0,0, 2,0,0));
        var sim = new Sim(make(definition.toString(), entry(data, 0)));
        sim.tick(3);
        assertEquals(0, sim.sink.spawns.size(), "collinear polygon emits no centroid particles");
        assertEquals(0, sim.budget.live(), "degenerate geometry consumes no budget");
        data.add("path", triangle(0,0,0, 5,0,0, 5,0,4, 4,0,4, 4,0,1, 1,0,1, 1,0,4, 0,0,4));
        sim.instance.touch(entry(data, 0), 3);
        sim.tick(4);
        assertEquals(20, sim.sink.spawns.size(), "valid geometry resumes the existing rate schedule");
        for (Spawn spawn : sim.sink.spawns) {
            double x = spawn.x() - 3, z = spawn.z() - 7;
            assertNear(2, spawn.y(), EPS, "world-axis path offset retained");
            assertTrue(x >= -1e-5 && x <= 5 + 1e-5 && z >= -1e-5 && z <= 4 + 1e-5, "path geometry ignores data.scale");
            assertTrue(!(x > 1 + 1e-5 && x < 4 - 1e-5 && z > 1 + 1e-5), "runtime polygon cannot fill a concave cutout");
        }
        data.add("path", triangle(0,0,0, 1,0,0, 2,0,0));
        sim.instance.touch(entry(data, 0), 7);
        sim.tick();
        assertEquals(20, sim.sink.spawns.size(), "collapsed updated path discards its prior prepared surface");
    }

    private static void checkCreatedRunning() {
        var instance = make(BASIC, entry(seed(), 1));
        assertTrue(instance.phase() == ParticleInstance.Phase.RUNNING, "new instance starts RUNNING");
        assertEquals(1, instance.emitters().size(), "one emitter in the main moment");
        assertEquals(0, instance.particleCount(), "no particles before the first tick");
        assertTrue(instance.retiring().isEmpty(), "nothing is retiring before the first tick");
    }

    private static void checkSpawns() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick(3);
        assertTrue(sim.sink.spawns.size() >= 3, "rate 20/s emits about one particle per tick");
        for (Spawn spawn : sim.sink.spawns) {
            assertTrue("puff".equals(spawn.emitter()), "main moment only emits 'puff', got " + spawn.emitter());
        }
    }

    private static void checkScaleAndTint() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        data.addProperty("scale", 2);
        data.addProperty("tint", 0x808080);
        var sim = new Sim(make(BASIC, entry(data, 1)));
        sim.tick(1);
        assertTrue(!sim.sink.spawns.isEmpty(), "one tick emits a particle");
        Spawn spawn = sim.sink.spawns.get(0);
        assertNear(2.0, spawn.size(), 1e-4, "scale 2 doubles state.size");
        assertEquals(0xFF808080L, spawn.color() & 0xFFFFFFFFL, "tint 0x808080 halves every colour channel");
    }

    private static void checkReleaseToDone() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick(3);
        sim.instance.release("test");
        assertTrue(sim.instance.phase() == ParticleInstance.Phase.EXITING, "release moves RUNNING to EXITING");
        for (int i = 0; i < 200 && sim.instance.phase() != ParticleInstance.Phase.DONE; i++) sim.tick();
        assertTrue(sim.instance.phase() == ParticleInstance.Phase.DONE, "EXITING reaches DONE once survivors expire");
        assertEquals(0, sim.instance.particleCount(), "no estimated survivors at DONE");
    }

    private static void checkInterruptHide() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick(1);
        sim.instance.interrupt();
        assertTrue(sim.instance.phase() == ParticleInstance.Phase.DONE, "interrupt with HIDE finishes immediately");
        assertEquals(0, sim.instance.particleCount(), "hidden instance tracks no survivors");
    }

    private static void checkSwitchMoment() {
        var sim = new Sim(make(BASIC, entry(seed(), 1)));
        sim.tick(1);
        sim.instance.switchMoment("impact");
        assertTrue("impact".equals(sim.instance.momentName()), "moment name switches to impact");
        assertEquals(1, sim.instance.emitters().size(), "impact declares one emitter");
        assertEquals(1, sim.instance.retiring().size(), "the old main emitter moves to retiring");
        assertTrue("burst".equals(sim.instance.emitters().get(0).spec().name()), "impact emitter is 'burst'");
    }

    private static void checkUnknownMoment() {
        var instance = make(BASIC, entry(seed(), 1));
        assertThrows(IllegalArgumentException.class, () -> instance.switchMoment("nope"), "unknown moment is rejected");
    }

    private static void checkEventChildOnce() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        JsonObject event = new JsonObject();
        event.addProperty("name", "boom");
        event.addProperty("tick", 1);
        data.add("event", event);
        var sim = new Sim(make(EVENT, entry(data, 1)));
        sim.instance.touch(entry(data, 1), 1);
        sim.tick(1);
        assertEquals(1, sim.instance.retiring().size(), "the event spawns one child emitter");
        sim.instance.touch(entry(data, 1), 2);
        sim.tick(1);
        assertEquals(1, sim.instance.retiring().size(), "the same event tick does not fire twice");
    }

    private static void checkBirthChild() {
        var sim = new Sim(make(BIRTH, entry(seed(), 1)));
        sim.tick(1);
        assertEquals(1, sim.instance.retiring().size(), "one parent birth triggers one child emitter");
        assertEquals(2, sim.sink.spawns.size(), "first tick emits the parent and its birth child");
        assertTrue(sim.sink.spawns.stream().anyMatch(spawn -> "puff".equals(spawn.emitter())), "parent emitted");
        assertTrue(sim.sink.spawns.stream().anyMatch(spawn -> "spark".equals(spawn.emitter())), "birth child emitted");
    }

    private static void checkDurationRelease() {
        var sim = new Sim(make(DURATION, entry(seed(), 1)));
        sim.tick(10);
        assertTrue(sim.instance.phase() == ParticleInstance.Phase.DONE,
            "finite duration releases and drains automatically, phase=" + sim.instance.phase());
    }

    private static void checkIntensity() {
        JsonObject full = new JsonObject();
        full.addProperty("seed", seed());
        JsonObject half = new JsonObject();
        half.addProperty("seed", seed());
        half.addProperty("intensity", 0.5);
        var fullSim = new Sim(make(BASIC, entry(full, 1)));
        var halfSim = new Sim(make(BASIC, entry(half, 1)));
        fullSim.tick(20);
        halfSim.tick(20);
        int fullCount = fullSim.sink.spawns.size(), halfCount = halfSim.sink.spawns.size();
        assertTrue(halfCount < fullCount, "intensity 0.5 emits fewer than intensity 1");
        assertTrue(Math.abs(fullCount - 2 * halfCount) <= 2,
            "intensity 0.5 roughly halves emission (" + halfCount + " vs " + fullCount + ")");
    }

    private static void checkLifecycleRelease() {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed());
        JsonObject lifecycle = new JsonObject();
        lifecycle.addProperty("reason", "released");
        data.add("lifecycle", lifecycle);
        var instance = make(BASIC, entry(data, 1));
        instance.touch(entry(data, 1), 1);
        assertTrue(instance.phase() == ParticleInstance.Phase.EXITING, "lifecycle releases a RUNNING instance");
    }

    private static void checkMissingTarget() {
        List<String> failures = new ArrayList<>();
        var instance = new ParticleInstance("test/key", parse(TARGET), entry(seed(), 1), (id, message) -> failures.add(message));
        assertTrue(instance.emitters().isEmpty(), "a target emitter is skipped when the entry has no target");
        assertEquals(1, failures.size(), "the missing binding is reported once");
        assertTrue(failures.get(0).contains("TARGET"), "the report names the missing binding: " + failures.get(0));
    }

    private static void checkEnvelopeLifecycleRelease() {
        var sim = new Sim(make(EVENT, entry(seed(), 1)));
        sim.tick();
        var data = new JsonObject();
        data.add("event", JsonParser.parseString("{\"name\":\"boom\",\"tick\":2}"));
        var released = entry(data, 1);
        released.add("lifecycle", JsonParser.parseString("{\"reason\":\"released\",\"tick\":2}"));
        sim.instance.touch(released, 2);
        sim.tick();
        assertTrue(sim.instance.phase() == ParticleInstance.Phase.EXITING, "envelope lifecycle stops emission");
        assertEquals(1, sim.sink.spawns.size(), "release suppresses simultaneous event and later parent births");
    }

    private static void checkReplay() {
        var first = new Sim(make(REPLAY, entry(seed(), 1)));
        var second = new Sim(make(REPLAY, entry(seed(), 1)));
        first.tick(15);
        second.tick(15);
        assertEquals(first.sink.spawns.size(), second.sink.spawns.size(), "same seed spawns the same count");
        for (int i = 0; i < first.sink.spawns.size(); i++) {
            Spawn a = first.sink.spawns.get(i), b = second.sink.spawns.get(i);
            assertNear(a.x(), b.x(), 0, "replay x at spawn " + i);
            assertNear(a.y(), b.y(), 0, "replay y at spawn " + i);
            assertNear(a.z(), b.z(), 0, "replay z at spawn " + i);
            assertNear(a.vx(), b.vx(), 0, "replay vx at spawn " + i);
            assertNear(a.vy(), b.vy(), 0, "replay vy at spawn " + i);
            assertNear(a.vz(), b.vz(), 0, "replay vz at spawn " + i);
            assertNear(a.lifetime(), b.lifetime(), 0, "replay lifetime at spawn " + i);
            assertNear(a.random(), b.random(), 0, "replay random at spawn " + i);
            assertEquals(a.color(), b.color(), "replay colour at spawn " + i);
        }
    }

    private static void checkBudgetRefresh() {
        var first = new Sim(make(BASIC, entry(seed(), 1)));
        var second = new Sim(make(BASIC, entry(seed(), 1)));
        first.tick(5);
        second.tick(5);
        var budget = new ParticleBudget();
        budget.refresh(List.of(first.instance, second.instance));
        assertEquals((long) first.instance.particleCount() + second.instance.particleCount(), budget.live(),
            "budget.refresh sums every instance's estimated survivors");
    }

    // --- scaffolding ---------------------------------------------------------------------------

    private static long seed() { return 20260918L; }

    private static ParticleDefinition parse(String json) {
        return DefinitionParser.parse("test:one", 1, JsonParser.parseString(json));
    }

    private static ParticleInstance make(String definition, JsonObject entry) {
        return new ParticleInstance("test/key", parse(definition), entry, (id, message) -> {});
    }

    private static JsonObject entry(long seed, double x) {
        JsonObject data = new JsonObject();
        data.addProperty("seed", seed);
        return entry(data, x);
    }

    private static JsonObject entry(JsonObject data, double x) {
        JsonObject entry = new JsonObject();
        entry.addProperty("key", "test/key");
        entry.addProperty("type", "test:one");
        entry.addProperty("version", 1);
        JsonArray position = new JsonArray();
        position.add(x);
        position.add(0);
        position.add(0);
        entry.add("position", position);
        entry.add("data", data);
        return entry;
    }

    /** Drives one instance through successive client ticks with a fresh budget. */
    private static final class Sim {
        final ParticleInstance instance;
        final ParticleBudget budget = new ParticleBudget();
        final RecordingSink sink = new RecordingSink();
        long tick;

        Sim(ParticleInstance instance) { this.instance = instance; }

        void tick() { instance.tick(++tick, 1.0, budget, sink); }

        void tick(int count) { for (int i = 0; i < count; i++) tick(); }
    }

    /** In-memory sink capturing the spawn-time snapshot. */
    private static final class RecordingSink implements ParticleSink {
        final List<Spawn> spawns = new ArrayList<>();

        @Override
        public void spawn(EmitterRuntime emitter, ParticleState state) {
            spawns.add(new Spawn(emitter.spec().name(), state.size, state.color, state.alpha,
                state.position.x, state.position.y, state.position.z,
                state.velocity.x, state.velocity.y, state.velocity.z, state.lifetime, state.random));
        }
    }

    private record Spawn(String emitter, float size, int color, float alpha,
                         double x, double y, double z, double vx, double vy, double vz,
                         int lifetime, double random) {}

    // --- definitions ---------------------------------------------------------------------------

    private static final String PATH_FILL = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"fill","particle":"minecraft:flame","bind":"path","shape":{"kind":"polygon"},"rate":100,"lifetime":40,"size":1}
              ]
            }
          }
        }
        """;

    private static final String PATH_OUTLINE = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"edge","particle":"minecraft:flame","bind":"path","shape":{"kind":"polyline","closed":true},"rate":100,"lifetime":40,"size":1}
              ]
            }
          }
        }
        """;

    private static final String ORIENTED_LINE = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"beam","particle":"minecraft:flame","bind":"point","orient":"direction","shape":{"kind":"line","length":4},"rate":20,"lifetime":40,"size":1}
              ]
            }
          }
        }
        """;

    private static final String BASIC = """
        {
          "interrupt": "hide",
          "moments": {
            "main": {
              "emitters": [
                {"name":"puff","particle":"minecraft:flame","bind":"point","rate":20,"lifetime":40,"size":1}
              ]
            },
            "impact": {
              "duration": 5,
              "exit": {"stop":5,"drain":0},
              "emitters": [
                {"name":"burst","particle":"minecraft:flame","bind":"point","burst":{"count":3},"lifetime":2,"size":1}
              ]
            }
          }
        }
        """;

    private static final String DURATION = """
        {
          "moments": {
            "main": {
              "duration": 5,
              "exit": {"stop":5,"drain":0},
              "emitters": [
                {"name":"spark","particle":"minecraft:flame","bind":"point","rate":20,"lifetime":1,"size":1}
              ]
            }
          }
        }
        """;

    private static final String TARGET = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"aim","particle":"minecraft:flame","bind":"target","rate":20,"lifetime":10,"size":1}
              ]
            }
          }
        }
        """;

    private static final String BIRTH = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"puff","particle":"minecraft:flame","bind":"point","rate":20,"lifetime":40,"size":1}
              ],
              "children": [
                {"on":"birth","of":"puff","emit":[
                  {"name":"spark","particle":"minecraft:flame","rate":20,"lifetime":10,"size":1}
                ]}
              ]
            }
          }
        }
        """;

    private static final String EVENT = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"puff","particle":"minecraft:flame","bind":"point","rate":20,"lifetime":40,"size":1}
              ],
              "children": [
                {"on":"event","event":"boom","emit":[
                  {"name":"bang","particle":"minecraft:flame","rate":20,"lifetime":10,"size":1}
                ]}
              ]
            }
          }
        }
        """;

    private static final String REPLAY = """
        {
          "moments": {
            "main": {
              "emitters": [
                {"name":"puff","particle":"minecraft:flame","bind":"point","rate":40,"lifetime":[3,6],
                 "size":1,"speed":[0.1,0.5],"spread":[10,40],"roll":[0,360],"direction":"up"}
              ]
            }
          }
        }
        """;

    // --- assertions ----------------------------------------------------------------------------

    private static void assertTrue(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void assertEquals(long expected, long actual, String message) {
        if (expected != actual) throw new AssertionError(message + " (expected " + expected + " but got " + actual + ")");
    }

    private static void assertNear(double expected, double actual, double tolerance, String message) {
        if (Math.abs(expected - actual) > tolerance)
            throw new AssertionError(message + " (expected " + expected + " but got " + actual + ")");
    }

    private static void assertThrows(Class<? extends Throwable> type, Runnable action, String message) {
        try {
            action.run();
        } catch (Throwable failure) {
            if (type.isInstance(failure)) return;
            throw new AssertionError(message + " (threw " + failure.getClass().getSimpleName() + ")", failure);
        }
        throw new AssertionError(message + " (no exception)");
    }
}
