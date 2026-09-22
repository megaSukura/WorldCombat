package dev.worldcombat.core.client.particles;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Function;
import org.joml.Vector3d;
import org.joml.Vector3f;

/**
 * One live presentation: the definition, the current moment, its anchors and emitters, and the
 * {@code RUNNING -> EXITING -> DONE} state machine. Owned by wave 3. Child emitter events
 * (birth/event) are dispatched here as local effects.
 *
 * <p>MadParticle owns per-particle simulation, so this class only tracks spawn-time records. Anchor
 * runtimes retain their schedules across payload updates; numeric bindings and anchors refresh from
 * the latest entry. MadParticle keeps already spawned particles unchanged.
 */
public final class ParticleInstance {
    /** Lifecycle phase. */
    public enum Phase { RUNNING, EXITING, DONE }

    /**
     * Per-tick context handed to each {@link EmitterRuntime}.
     *
     * @param tick      client tick number
     * @param lodFactor quality/distance emission scale in 0..1
     * @param budget    the shared budget gate
     * @param instance  the owning instance
     * @param sink      where spawned states go (the Minecraft mirror factory, or a test sink)
     * @param anchors   resolves any binding of this instance (source/target/projectile/point); never null,
     *                  may return null when the entry never supplied that binding
     */
    public record InstanceContext(long tick, double lodFactor, ParticleBudget budget, ParticleInstance instance,
                                  ParticleSink sink, Function<ParticleDefinition.Bind, Anchor> anchors) {}

    private static final long NEVER = Long.MIN_VALUE;
    private static final Vector3f NO_OFFSET = new Vector3f();

    private final String key;
    private final ParticleDefinition authoredDefinition;
    private ParticleDefinition definition;
    private JsonObject entry;
    private final BiConsumer<String, String> failureReporter;
    private final long seed;
    private final Map<ParticleDefinition.Bind, Anchor> bindings = new EnumMap<>(ParticleDefinition.Bind.class);
    private final Vector3f entryPosition = new Vector3f();
    private final List<EmitterRuntime> emitters = new ArrayList<>();
    private final List<EmitterRuntime> retiring = new ArrayList<>();
    private final List<PendingChild> pending = new ArrayList<>();
    private final Set<EmitterRuntime> childRuntimes = Collections.newSetFromMap(new IdentityHashMap<>());

    private Phase phase = Phase.RUNNING;
    private String momentName;
    private long momentStartTick = NEVER;
    private long lastTouched = NEVER;
    private long lastEventTick = NEVER;
    private int nextEmitterIndex;
    private double scale = 1;
    private double intensity = 1;
    private int tint = -1;
    private Vector3d direction;
    private boolean missingBindingReported;

    /**
     * @param key             the owning entry key, used for diagnostics and as the default seed
     * @param definition      the parsed definition
     * @param entry           the server scene entry ({@code key/source/position/data})
     * @param failureReporter receives {@code (key, message)} failures, one per missing binding group per instance
     */
    public ParticleInstance(String key, ParticleDefinition definition, JsonObject entry,
                            BiConsumer<String, String> failureReporter) {
        if (key == null || key.isBlank()) throw new IllegalArgumentException("ParticleInstance requires a key");
        if (definition == null) throw new IllegalArgumentException("ParticleInstance '" + key + "' requires a definition");
        this.key = key;
        this.authoredDefinition = definition;
        this.entry = entry == null ? new JsonObject() : entry.deepCopy();
        this.failureReporter = failureReporter;
        JsonObject data = data();
        this.definition = definition.resolve(data);
        this.seed = readSeed(data);
        this.momentName = readMoment(data);
        this.scale = readScale(data);
        this.intensity = readIntensity(data);
        this.tint = readTint(data);
        this.direction = readDirection(data);
        parseEntryPosition();
        buildBindings();
        ParticleDefinition.Moment moment = this.definition.moment(momentName);
        if (moment == null)
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.moment '" + momentName + "' is not declared");
        createMoment(moment);
    }

    /**
     * Lightweight constructor for pure-logic checks that only need instance identity and a seed. Uses
     * the definition's first moment when it has one; no entry data means point bindings only.
     */
    public ParticleInstance(String key, ParticleDefinition definition, long seed) {
        if (key == null || key.isBlank()) throw new IllegalArgumentException("ParticleInstance requires a key");
        if (definition == null) throw new IllegalArgumentException("ParticleInstance '" + key + "' requires a definition");
        this.key = key;
        this.authoredDefinition = definition;
        this.definition = definition.resolve(new JsonObject());
        this.entry = new JsonObject();
        this.failureReporter = null;
        this.seed = seed;
        this.momentName = definition.moments().isEmpty() ? "main" : definition.moments().keySet().iterator().next();
        parseEntryPosition();
        buildBindings();
        ParticleDefinition.Moment moment = this.definition.moment(momentName);
        if (moment != null) createMoment(moment);
    }

    public String key() { return key; }

    public ParticleDefinition definition() { return definition; }

    public long seed() { return seed; }

    public Phase phase() { return phase; }

    public String momentName() { return momentName; }

    /** data.scale from the latest payload: size multiplier for every emitter, geometry multiplier for point-fit emitters. */
    public double scale() { return scale; }

    /** Multiplier on rate and burst count; trail spacing remains distance-based. */
    public double intensity() { return intensity; }

    /** data.direction from the latest payload (unit vector), or null; emitters with orient "direction" turn toward it. */
    public Vector3d direction() { return direction; }

    /** Tick number supplied by the most recent {@link #touch(JsonObject, long)}. */
    public long lastTouched() { return lastTouched; }

    /** Emitters of the current moment. */
    public List<EmitterRuntime> emitters() { return Collections.unmodifiableList(emitters); }

    /** Emitters from earlier moments, event bursts or birth bursts that are still draining. */
    public List<EmitterRuntime> retiring() { return Collections.unmodifiableList(retiring); }

    /** Sum of estimated live particles across current and retiring emitters. */
    public int particleCount() {
        int total = 0;
        for (EmitterRuntime emitter : emitters) total += Math.max(0, emitter.particleCount());
        for (EmitterRuntime emitter : retiring) total += Math.max(0, emitter.particleCount());
        return total;
    }

    /** True while any current or retiring emitter still has estimated survivors. */
    public boolean alive() {
        for (EmitterRuntime emitter : emitters) if (emitter.alive()) return true;
        for (EmitterRuntime emitter : retiring) if (emitter.alive()) return true;
        return false;
    }

    /** Resolves bindings for emitter contexts; missing bindings are absent (null). */
    public Function<ParticleDefinition.Bind, Anchor> anchors() { return bindings::get; }

    /** Distance from a world point to the {@code source} anchor, falling back to the entry position. */
    public double distanceToSource(double x, double y, double z) {
        Anchor source = bindings.get(ParticleDefinition.Bind.SOURCE);
        Vector3d position = new Vector3d();
        if (source != null && source.resolve(1f, position)) return position.distance(x, y, z);
        double dx = entryPosition.x - x, dy = entryPosition.y - y, dz = entryPosition.z - z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Marks the instance as still present this frame and updates authored overrides from the entry
     * payload (moment/scale/intensity/tint/event/lifecycle). Owned by wave 3.
     */
    public void touch(JsonObject entry, long frame) {
        if (entry == null) throw new IllegalArgumentException("ParticleInstance '" + key + "' touch requires an entry");
        this.lastTouched = frame;
        if (phase != Phase.RUNNING) return;
        JsonObject data = dataOf(entry);
        String requested = readMoment(data);
        boolean changed = !this.entry.equals(entry);
        if (changed) {
            if (!data().equals(data)) definition = authoredDefinition.resolve(data);
            this.entry = entry.deepCopy();
            parseEntryPosition();
            buildBindings();
        }
        scale = readScale(data);
        intensity = readIntensity(data);
        tint = readTint(data);
        direction = readDirection(data);
        if (!requested.equals(momentName)) switchMoment(requested);
        else if (changed) refreshMoment();

        if (phase == Phase.RUNNING) {
            JsonElement lifecycle = entry.get("lifecycle");
            if (lifecycle == null || lifecycle.isJsonNull()) lifecycle = data.get("lifecycle");
            if (lifecycle != null && lifecycle.isJsonObject()) {
                JsonObject value = lifecycle.getAsJsonObject();
                String reason = value.has("reason") && !value.get("reason").isJsonNull()
                    ? value.get("reason").getAsString() : "released";
                release(reason);
            }
        }

        JsonElement event = phase == Phase.RUNNING ? data.get("event") : null;
        if (event != null && event.isJsonObject()) {
            JsonObject value = event.getAsJsonObject();
            String name = stringValue(value, "name");
            long eventTick = longValue(value, "tick", frame);
            if (name != null && eventTick > lastEventTick) {
                lastEventTick = eventTick;
                fireEvent(name);
            }
        }
    }

    /**
     * Advances all emitters one client tick.
     *
     * @param tick   absolute client tick number
     * @param lod    quality/distance scale in 0..1; schedules apply intensity separately
     * @param budget the shared budget gate, or null
     * @param sink   where spawned particle states go, or null for {@link ParticleSink#NONE}
     */
    public void tick(long tick, double lod, ParticleBudget budget, ParticleSink sink) {
        if (momentStartTick == NEVER) momentStartTick = tick;
        ParticleSink real = sink == null ? ParticleSink.NONE : sink;
        ParticleSink wrapped = (emitter, state) -> {
            state.size *= (float) scale;
            state.color = tintMul(state.color, tint);
            real.spawn(emitter, state);
            fireBirth(emitter, state);
        };
        InstanceContext context = new InstanceContext(tick, lod, budget, this, wrapped, anchors());

        for (int i = 0; i < emitters.size(); i++) emitters.get(i).tick(context);
        for (int i = 0; i < retiring.size(); i++) retiring.get(i).tick(context);
        drainPending(context);

        ParticleDefinition.Moment moment = definition.moment(momentName);
        if (moment != null && !moment.indefinite() && tick - momentStartTick >= moment.duration()) release("duration");

        retiring.removeIf(emitter -> {
            if (emitter.alive()) return false;
            childRuntimes.remove(emitter);
            return true;
        });
        if (phase == Phase.EXITING && !alive()) phase = Phase.DONE;
    }

    /** Natural end: stop emission, then drain surviving particles. */
    public void release(String reason) {
        if (phase != Phase.RUNNING) return;
        phase = Phase.EXITING;
        for (EmitterRuntime emitter : emitters) emitter.stop();
        pending.clear();
    }

    /** Forced end (key vanished or lifecycle reason): apply the definition's interrupt mode. */
    public void interrupt() {
        if (definition.interrupt() == ParticleDefinition.ExitMode.HIDE) {
            for (EmitterRuntime emitter : emitters) emitter.hide();
            for (EmitterRuntime emitter : retiring) emitter.hide();
            pending.clear();
            phase = Phase.DONE;
        } else {
            release("interrupt");
        }
    }

    /**
     * Switches to another moment, exiting the current one first.
     *
     * @throws IllegalArgumentException when the definition does not declare {@code name}
     */
    public void switchMoment(String name) {
        ParticleDefinition.Moment moment = definition.moment(name);
        if (moment == null)
            throw new IllegalArgumentException("ParticleInstance '" + key + "' unknown moment '" + name + "'");
        if (phase != Phase.RUNNING) return;
        if (name.equals(momentName)) return;
        for (EmitterRuntime emitter : emitters) {
            emitter.stop();
            retiring.add(emitter);
        }
        emitters.clear();
        momentName = name;
        momentStartTick = NEVER;
        createMoment(moment);
    }

    // --- internals ------------------------------------------------------------------------------

    private void createMoment(ParticleDefinition.Moment moment) {
        for (ParticleDefinition.EmitterSpec spec : moment.emitters()) {
            Anchor anchor = emitterAnchor(spec);
            if (anchor == null) {
                reportMissingBinding(spec.bind());
                continue;
            }
            emitters.add(new EmitterRuntime(nextEmitterIndex++, spec, moment, seed, anchor));
        }
    }

    private void refreshMoment() {
        ParticleDefinition.Moment moment = definition.moment(momentName);
        for (ParticleDefinition.EmitterSpec spec : moment.emitters()) {
            EmitterRuntime existing = null;
            for (EmitterRuntime emitter : emitters) if (emitter.spec().name().equals(spec.name())) { existing = emitter; break; }
            Anchor anchor = emitterAnchor(spec);
            if (anchor == null) {
                reportMissingBinding(spec.bind());
                if (existing != null) { existing.stop(); retiring.add(existing); emitters.remove(existing); }
            } else if (existing != null) {
                existing.update(spec, moment, anchor);
            } else {
                EmitterRuntime emitter = new EmitterRuntime(nextEmitterIndex++, spec, moment, seed, anchor);
                emitter.startAt(momentStartTick);
                emitters.add(emitter);
            }
        }
    }

    private Anchor emitterAnchor(ParticleDefinition.EmitterSpec spec) {
        if (spec.bind() == ParticleDefinition.Bind.PATH) return Anchors.path(data(), sourceRef(), spec.offset(), spec.height());
        if (spec.bind() == ParticleDefinition.Bind.POINT) {
            Anchor base = bindings.get(ParticleDefinition.Bind.POINT);
            if (base instanceof Anchors.PointAnchor point) {
                Vector3f offset = spec.offset();
                return Anchors.point(point.x() + offset.x, point.y() + offset.y, point.z() + offset.z);
            }
            return base;
        }
        var id = Anchors.uuidOf(spec.bind(), data(), sourceRef());
        if (id == null) return null;
        return Anchors.entity(id, spec.offset(), spec.height(), spec.fit() == ParticleDefinition.Fit.BODY);
    }

    private void buildBindings() {
        bindings.clear();
        bindings.put(ParticleDefinition.Bind.POINT, Anchors.pointOf(data(), entry));
        JsonObject data = data();
        String source = sourceRef();
        var sourceId = Anchors.uuidOf(ParticleDefinition.Bind.SOURCE, data, source);
        if (sourceId != null)
            bindings.put(ParticleDefinition.Bind.SOURCE, Anchors.entity(sourceId, NO_OFFSET, Anchors.DEFAULT_HEIGHT));
        var targetId = Anchors.uuidOf(ParticleDefinition.Bind.TARGET, data, source);
        if (targetId != null)
            bindings.put(ParticleDefinition.Bind.TARGET, Anchors.entity(targetId, NO_OFFSET, Anchors.DEFAULT_HEIGHT));
        var projectileId = Anchors.uuidOf(ParticleDefinition.Bind.PROJECTILE, data, source);
        if (projectileId != null)
            bindings.put(ParticleDefinition.Bind.PROJECTILE,
                Anchors.entity(projectileId, NO_OFFSET, Anchors.DEFAULT_HEIGHT));
    }

    private void fireBirth(EmitterRuntime emitter, ParticleState state) {
        if (phase != Phase.RUNNING) return;
        if (childRuntimes.contains(emitter)) return;
        ParticleDefinition.Moment moment = definition.moment(momentName);
        if (moment == null) return;
        String name = emitter.spec().name();
        for (ParticleDefinition.ChildSpec child : moment.children()) {
            if (child.on() != ParticleDefinition.ChildTrigger.BIRTH) continue;
            if (child.of() != null && !child.of().equals(name)) continue;
            for (ParticleDefinition.EmitterSpec spec : child.emit())
                pending.add(new PendingChild(spec, childAnchor(spec, state.position.x, state.position.y, state.position.z)));
        }
    }

    private void fireEvent(String name) {
        ParticleDefinition.Moment moment = definition.moment(momentName);
        if (moment == null) return;
        Vector3d source = new Vector3d();
        Anchor sourceAnchor = bindings.get(ParticleDefinition.Bind.SOURCE);
        boolean resolved = sourceAnchor != null && sourceAnchor.resolve(1f, source);
        if (!resolved) {
            Anchor point = bindings.get(ParticleDefinition.Bind.POINT);
            resolved = point != null && point.resolve(1f, source);
        }
        for (ParticleDefinition.ChildSpec child : moment.children()) {
            if (child.on() != ParticleDefinition.ChildTrigger.EVENT) continue;
            if (child.event() == null || !child.event().equals(name)) continue;
            for (ParticleDefinition.EmitterSpec spec : child.emit())
                pending.add(new PendingChild(spec, resolved
                    ? childAnchor(spec, source.x, source.y, source.z)
                    : childAnchor(spec, 0, 0, 0)));
        }
    }

    private void drainPending(InstanceContext context) {
        if (pending.isEmpty()) return;
        ParticleDefinition.Moment current = definition.moment(momentName);
        ParticleDefinition.Moment synthetic = new ParticleDefinition.Moment(1, 1,
            current == null ? 0 : current.drain(), List.of(), List.of());
        List<PendingChild> batch = new ArrayList<>(pending);
        pending.clear();
        for (PendingChild child : batch) {
            EmitterRuntime runtime = new EmitterRuntime(nextEmitterIndex++, child.spec(), synthetic, seed, child.anchor());
            childRuntimes.add(runtime);
            runtime.tick(context);
            runtime.stop();
            retiring.add(runtime);
        }
    }

    private static Anchor childAnchor(ParticleDefinition.EmitterSpec spec, double x, double y, double z) {
        Vector3f offset = spec.offset();
        return Anchors.point(x + offset.x, y + offset.y, z + offset.z);
    }

    private void reportMissingBinding(ParticleDefinition.Bind bind) {
        if (missingBindingReported) return;
        missingBindingReported = true;
        if (failureReporter != null)
            failureReporter.accept(key, "missing " + bind + " binding; bound emitters were skipped");
    }

    private void parseEntryPosition() {
        entryPosition.set(0, 0, 0);
        if (entry == null) return;
        JsonElement element = entry.get("position");
        if (element == null || !element.isJsonArray() || element.getAsJsonArray().size() != 3) return;
        var array = element.getAsJsonArray();
        if (!array.get(0).isJsonPrimitive() || !array.get(0).getAsJsonPrimitive().isNumber()) return;
        entryPosition.set(array.get(0).getAsFloat(), array.get(1).getAsFloat(), array.get(2).getAsFloat());
    }

    private JsonObject data() { return dataOf(entry); }

    private String sourceRef() {
        if (entry == null) return null;
        String value = stringValue(entry, "source");
        return value;
    }

    private static JsonObject dataOf(JsonObject source) {
        if (source == null) return new JsonObject();
        JsonElement element = source.get("data");
        return element != null && element.isJsonObject() ? element.getAsJsonObject() : new JsonObject();
    }

    private long readSeed(JsonObject data) {
        JsonElement element = data.get("seed");
        if (element == null || element.isJsonNull()) return key.hashCode();
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.seed must be a number");
        return element.getAsLong();
    }

    private String readMoment(JsonObject data) {
        JsonElement element = data.get("moment");
        if (element == null || element.isJsonNull()) return "main";
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString())
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.moment must be a string");
        return element.getAsString();
    }

    private double readScale(JsonObject data) {
        double value = numberValue(data, "scale", 1);
        if (value < 0) throw new IllegalArgumentException("ParticleInstance '" + key + "' data.scale must be at least 0, got " + value);
        return value;
    }

    private double readIntensity(JsonObject data) {
        double value = numberValue(data, "intensity", 1);
        if (value < 0)
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.intensity must be at least 0, got " + value);
        return value;
    }

    private Vector3d readDirection(JsonObject data) {
        JsonElement element = data.get("direction");
        if (element == null || element.isJsonNull()) return null;
        if (!element.isJsonArray() || element.getAsJsonArray().size() != 3)
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.direction must be [x, y, z]");
        var array = element.getAsJsonArray();
        var value = new Vector3d(array.get(0).getAsDouble(), array.get(1).getAsDouble(), array.get(2).getAsDouble());
        if (!value.isFinite() || value.lengthSquared() < 1e-12) return null;
        return value.normalize();
    }

    private int readTint(JsonObject data) {
        JsonElement element = data.get("tint");
        if (element == null || element.isJsonNull()) return -1;
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.tint must be -1 or 0xRRGGBB");
        long value = element.getAsLong();
        if (value != -1 && (value < 0 || value > 0xFFFFFF))
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data.tint must be -1 or 0xRRGGBB, got " + value);
        return (int) value;
    }

    private double numberValue(JsonObject owner, String field, double fallback) {
        JsonElement element = owner.get(field);
        if (element == null || element.isJsonNull()) return fallback;
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data." + field + " must be a number");
        double value = element.getAsDouble();
        if (!Double.isFinite(value))
            throw new IllegalArgumentException("ParticleInstance '" + key + "' data." + field + " must be finite");
        return value;
    }

    private static String stringValue(JsonObject owner, String field) {
        if (owner == null) return null;
        JsonElement element = owner.get(field);
        if (element == null || element.isJsonNull()) return null;
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString()) return null;
        return element.getAsString();
    }

    private static long longValue(JsonObject owner, String field, long fallback) {
        JsonElement element = owner.get(field);
        if (element == null || element.isJsonNull()) return fallback;
        if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber()) return fallback;
        return element.getAsLong();
    }

    private static int tintMul(int argb, int tint) {
        if (tint < 0) return argb;
        int alpha = argb & 0xFF000000;
        int red = ((argb >>> 16) & 0xFF) * ((tint >>> 16) & 0xFF) / 255;
        int green = ((argb >>> 8) & 0xFF) * ((tint >>> 8) & 0xFF) / 255;
        int blue = (argb & 0xFF) * (tint & 0xFF) / 255;
        return alpha | (red << 16) | (green << 8) | blue;
    }

    private record PendingChild(ParticleDefinition.EmitterSpec spec, Anchor anchor) {}
}
