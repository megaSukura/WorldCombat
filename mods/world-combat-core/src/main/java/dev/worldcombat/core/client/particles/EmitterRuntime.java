package dev.worldcombat.core.client.particles;

import java.util.ArrayList;
import java.util.List;
import java.util.PriorityQueue;
import org.joml.Quaternionf;
import org.joml.Vector3d;
import org.joml.Vector3f;

/**
 * One emitter inside one live instance: schedule, anchor, spawn volume and the estimated-survival
 * record. Owned by the emitter-runtime module. Pure logic: it never touches Minecraft. Spawned
 * states are handed to the {@link ParticleSink} from the {@link ParticleInstance.InstanceContext};
 * the sink maps them into a MadParticle option.
 *
 * <p>MadParticle owns the per-particle simulation and rendering, so this runtime only resolves the
 * anchor, records its history, decides spawn points, initial velocity and spawn-time appearance,
 * and tracks when each spawned particle is expected to die. It never keeps or ages a particle list.
 */
public final class EmitterRuntime {
    private final int index;
    private ParticleDefinition.EmitterSpec spec;
    private final EmitterSchedule schedule;
    private final ParticleRandom random;
    private Anchor anchor;
    private final AnchorHistory history = new AnchorHistory(64);
    private Shape shape;
    private Shape pathSampler;
    private final Vector3d pathCentroid = new Vector3d();
    /** Absolute client ticks at which spawned particles are expected to leave the simulation. */
    private final PriorityQueue<Long> expiries = new PriorityQueue<>();
    private final Vector3d anchorPosition = new Vector3d();
    private final Vector3d anchorDelta = new Vector3d();
    private final Vector3d previousSample = new Vector3d();
    private final List<Vector3d> trailPoints = new ArrayList<>();
    private long startTick = Long.MIN_VALUE;
    private int momentTick;
    private double trailCarry;
    private long spawnOrdinal;
    /** data.scale of the owning instance; point-fit emitters read their geometry from it. */
    private double instanceScale = 1;
    /** Rotation taking the shape's local +Y onto this tick's orientation axis; null keeps the authored frame. */
    private Quaternionf frame;

    /**
     * @param index  emitter index inside the instance (salts the random stream and tags states)
     * @param spec   the authored emitter
     * @param moment the owning moment, for end times
     * @param seed   instance seed; forked by {@code index}
     * @param anchor the resolved base anchor for {@code spec.bind()}
     */
    public EmitterRuntime(int index, ParticleDefinition.EmitterSpec spec, ParticleDefinition.Moment moment, long seed, Anchor anchor) {
        if (spec == null) throw new IllegalArgumentException("EmitterRuntime requires an emitter spec");
        if (moment == null) throw new IllegalArgumentException("EmitterRuntime for '" + spec.name() + "' requires a moment");
        if (anchor == null) throw new IllegalArgumentException("EmitterRuntime for '" + spec.name() + "' requires an anchor");
        this.index = index;
        this.spec = spec;
        this.random = new ParticleRandom(seed).fork(index);
        this.schedule = new EmitterSchedule(spec, moment, this.random.nextDouble());
        this.anchor = anchor;
        this.shape = spec.shape() == null ? Shapes.point() : spec.shape();
    }

    public int index() { return index; }

    public ParticleDefinition.EmitterSpec spec() { return spec; }

    public EmitterSchedule schedule() { return schedule; }

    public ParticleRandom random() { return random; }

    public Anchor anchor() { return anchor; }

    /** A payload update changes future spawns, preserving the schedule, random stream and survivors. */
    public void update(ParticleDefinition.EmitterSpec spec, ParticleDefinition.Moment moment, Anchor anchor) {
        this.spec = spec;
        this.anchor = anchor;
        this.shape = spec.shape() == null ? Shapes.point() : spec.shape();
        schedule.update(spec, moment);
    }

    /** A late-resolved binding joins the current moment's clock. */
    void startAt(long tick) { startTick = tick; }

    /** Recorded anchor positions, newest first; used for trails and spawn distribution. */
    public AnchorHistory history() { return history; }

    /** Estimated particles still alive: spawns whose estimated death tick has not arrived. */
    public int particleCount() { return expiries.size(); }

    /** Advances emission by one client tick. */
    public void tick(ParticleInstance.InstanceContext context) {
        if (context == null) throw new IllegalArgumentException("EmitterRuntime '" + spec.name() + "' requires a tick context");
        long clientTick = context.tick();
        if (startTick == Long.MIN_VALUE) startTick = clientTick;
        momentTick = (int) Math.max(0L, clientTick - startTick);
        instanceScale = context.instance() == null ? 1 : context.instance().scale();

        anchorPosition.set(0, 0, 0);
        boolean resolved = anchor.resolve(1f, anchorPosition);
        anchorDelta.set(0, 0, 0);
        if (resolved) {
            if (history.size() > 0 && history.position(0, previousSample)) {
                anchorDelta.set(anchorPosition).sub(previousSample);
            }
            history.record(momentTick, anchorPosition.x, anchorPosition.y, anchorPosition.z);
        } else if (history.size() > 0) {
            history.position(0, anchorPosition);
        }
        boolean anchored = resolved || history.size() > 0;
        pathSampler = null;
        if (shape instanceof Shapes.PathShape pathShape && anchor instanceof Anchors.PathAnchor path) {
            int vertices = path.vertices(pathCentroid);
            pathSampler = pathShape.prepare(path.positions(), vertices, pathCentroid);
            anchored = pathSampler != null;
        }
        frame = orientation(context);

        expire(clientTick);

        if (spec.trails()) {
            if (anchored && context.lodFactor() > 0 && (context.instance() == null || context.instance().intensity() > 0)
                && schedule.emitting(momentTick)) {
                trailPoints.clear();
                collectTrailPoints(trailPoints);
                int batch = trailPoints.size();
                for (int i = 0; i < batch; i++) {
                    if (!maySpawn(context)) break;
                    spawnAt(context, trailPoints.get(i), i, batch, clientTick);
                }
            }
        } else {
            int wanted = anchored ? schedule.spawnCount(momentTick, context.lodFactor(),
                context.instance() == null ? 1 : context.instance().intensity()) : 0;
            if (wanted > 0) {
                Vector3d previousAnchor = null;
                if (history.size() >= 2) {
                    previousAnchor = new Vector3d();
                    if (!history.position(1, previousAnchor)) previousAnchor = null;
                }
                for (int i = 0; i < wanted; i++) {
                    if (!maySpawn(context)) break;
                    Vector3d base = new Vector3d(anchorPosition);
                    if (previousAnchor != null) {
                        base.set(previousAnchor).lerp(anchorPosition, (i + 1.0) / (wanted + 1.0));
                    }
                    spawnAt(context, base, i, wanted, clientTick);
                }
            }
        }

        schedule.finished(momentTick, expiries.size());
    }

    /** False once the schedule is finished and the estimated survival has drained. */
    public boolean alive() {
        return !schedule.finished(momentTick, expiries.size());
    }

    /** Stops emission; particles already handed to MadParticle finish their lifetimes. */
    public void stop() { schedule.stop(); }

    /**
     * Stops emission and drops the estimated-survival records immediately, so {@link #alive()} is
     * false and {@link #particleCount()} is 0. Particles already spawned belong to MadParticle and
     * fade out on their own; this runtime can no longer recall them.
     */
    public void hide() {
        schedule.hide();
        expiries.clear();
    }

    private void expire(long tick) {
        while (!expiries.isEmpty() && expiries.peek() <= tick) expiries.poll();
    }

    private boolean maySpawn(ParticleInstance.InstanceContext context) {
        if (spec.capped() && (long) expiries.size() + spec.amount() > spec.maxParticles()) return false;
        ParticleBudget budget = context.budget();
        return budget == null || budget.allow(context.instance(), this);
    }

    private void spawnAt(ParticleInstance.InstanceContext context, Vector3d base, int i, int count, long clientTick) {
        double particleRandom = random.nextDouble();
        long sampledLifetime = Math.round(spec.lifetime().sample(0, particleRandom));
        int lifetime = (int) Math.max(1L, Math.min(sampledLifetime, (long) Integer.MAX_VALUE));
        ParticleRandom stream = random.fork((int) (spawnOrdinal & 0x7FFFFFFFL));
        spawnOrdinal++;

        // Body fit: the same authored geometry reads alike on a small and a huge combatant.
        // Point fit: geometry follows the mechanic radius the server passed as data.scale.
        double body = bodyFactor();
        double geometry = geometryFactor();
        Vector3d position;
        Vector3f shapeDirection;
        if (pathSampler != null) {
            // Path shapes sample the real vertices: world geometry that no factor may scale.
            Shape.Spawn spawn = pathSampler.sample(stream, i, count);
            Vector3f offset = spawn.position();
            position = new Vector3d(pathCentroid.x + offset.x, pathCentroid.y + offset.y, pathCentroid.z + offset.z);
            shapeDirection = spawn.direction();
        } else {
            Shape.Spawn spawn = shape.sample(stream, i, count);
            Vector3f offset = new Vector3f(spawn.position());
            shapeDirection = new Vector3f(spawn.direction());
            if (frame != null) { frame.transform(offset); frame.transform(shapeDirection); }
            position = new Vector3d(base.x + offset.x * geometry, base.y + offset.y * geometry, base.z + offset.z * geometry);
        }

        Vector3d direction = initialDirection(spec.direction(), shapeDirection, position, context);
        double spreadDegrees = spec.spread() == null ? 0 : spec.spread().sample(0, particleRandom);
        if (spreadDegrees > 0) direction = perturb(stream, direction, spreadDegrees);
        if (direction.lengthSquared() < 1e-12) direction.set(0, 1, 0);
        else direction.normalize();
        double speed = spec.speed() == null ? 0 : Math.max(0, spec.speed().sample(0, particleRandom)) * geometry;

        ParticleState state = new ParticleState(index, particleRandom, lifetime);
        state.position.set(position);
        state.velocity.set(direction).mul(speed);
        // Size: body factor here; the instance sink multiplies data.scale for every emitter.
        state.size = (float) (spec.sizeBegin() * body);
        state.alpha = (float) spec.alphaBegin();
        state.color = 0xFF000000 | colorAt();
        state.roll = spec.roll() == null ? 0f : (float) spec.roll().sample(0, particleRandom);
        state.spin = (float) spec.spin();

        double jitterScale = 1.0 + spec.lifeJitter() / 100.0;
        long expiry = clientTick + (long) Math.ceil(lifetime * jitterScale);
        // MadParticle multiplies each spawn by spec.amount(); count them all against the budget.
        for (int copy = 0; copy < Math.max(1, spec.amount()); copy++) expiries.add(expiry);
        if (context.budget() != null) context.budget().add(spec.amount());

        ParticleSink sink = context.sink();
        if (sink != null) sink.spawn(this, state);
    }

    /**
     * The spawn colour. A constant ramp returns the same value every spawn; a gradient ramp is sampled
     * over the moment's progress, so a burst shifts hue as it plays (MadParticle fixes one colour per
     * particle at spawn and cannot interpolate it over the particle's life).
     */
    private int colorAt() {
        ColorGradient ramp = spec.colorRamp();
        if (ramp == null) return spec.color();
        ParticleDefinition.Moment moment = schedule.moment();
        int duration = moment == null ? 0 : moment.duration();
        double progress = duration > 0 ? Math.clamp((double) momentTick / duration, 0, 1) : 0;
        return ramp.rgb(progress);
    }

    private Vector3d initialDirection(ParticleDefinition.Direction policy, Vector3f shapeDirection, Vector3d position,
                                      ParticleInstance.InstanceContext context) {
        return switch (policy) {
            case SHAPE -> new Vector3d(shapeDirection);
            case UP -> new Vector3d(0, 1, 0);
            case DOWN -> new Vector3d(0, -1, 0);
            case VELOCITY -> anchorDelta.lengthSquared() < 1e-12 ? new Vector3d(0, 1, 0) : new Vector3d(anchorDelta);
            case FIXED -> spec.fixedDirection() == null || spec.fixedDirection().lengthSquared() < 1e-12
                ? new Vector3d(0, 1, 0) : new Vector3d(spec.fixedDirection());
            case OUTWARD -> outward(position);
            case INWARD -> outward(position).negate();
            case TOWARD -> {
                Vector3d target = targetPosition(context);
                if (target == null) yield outward(position);
                Vector3d toward = new Vector3d(target).sub(position);
                yield toward.lengthSquared() < 1e-12 ? outward(position) : toward.normalize();
            }
            case AWAY -> {
                Vector3d target = targetPosition(context);
                if (target == null) yield outward(position).negate();
                Vector3d away = new Vector3d(target).sub(position);
                yield away.lengthSquared() < 1e-12 ? outward(position).negate() : away.normalize().negate();
            }
        };
    }

    private Vector3d outward(Vector3d position) {
        Vector3d direction = new Vector3d(position).sub(anchorPosition);
        return direction.lengthSquared() < 1e-12 ? new Vector3d(0, 1, 0) : direction.normalize();
    }

    /** The axis the shape should stand along this tick, per {@code orient}; null means the authored frame. */
    private Quaternionf orientation(ParticleInstance.InstanceContext context) {
        Vector3d axis = switch (spec.orient()) {
            case FIXED -> null;
            case DIRECTION -> context.instance() == null ? null : context.instance().direction();
            case VELOCITY -> anchorDelta.lengthSquared() < 1e-12 ? null : new Vector3d(anchorDelta);
            case TOWARD -> {
                Vector3d target = targetPosition(context);
                if (target == null) yield null;
                Vector3d toward = new Vector3d(target).sub(anchorPosition);
                yield toward.lengthSquared() < 1e-12 ? null : toward;
            }
        };
        if (axis == null) return null;
        Vector3f unit = new Vector3f((float) axis.x, (float) axis.y, (float) axis.z).normalize();
        return new Quaternionf().rotationTo(0f, 1f, 0f, unit.x, unit.y, unit.z);
    }

    private Vector3d targetPosition(ParticleInstance.InstanceContext context) {
        if (context.anchors() == null) return null;
        Anchor target = context.anchors().apply(ParticleDefinition.Bind.TARGET);
        if (target == null) return null;
        Vector3d out = new Vector3d();
        return target.resolve(1f, out) ? out : null;
    }

    private static Vector3d perturb(ParticleRandom stream, Vector3d direction, double spreadDegrees) {
        Vector3d axis = new Vector3d(direction);
        if (axis.lengthSquared() < 1e-12) axis.set(0, 1, 0);
        axis.normalize();
        double maxAngle = Math.toRadians(Math.clamp(spreadDegrees, 0, 180));
        double cosMax = Math.cos(maxAngle);
        double cosTheta = 1 - stream.nextDouble() * (1 - cosMax);
        double sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
        double phi = 2 * Math.PI * stream.nextDouble();
        Vector3d helper = Math.abs(axis.y) < 0.99 ? new Vector3d(0, 1, 0) : new Vector3d(1, 0, 0);
        Vector3d tangent = new Vector3d(axis).cross(helper).normalize();
        Vector3d bitangent = new Vector3d(axis).cross(tangent).normalize();
        Vector3d out = new Vector3d(axis).mul(cosTheta);
        out.fma(sinTheta * Math.cos(phi), tangent);
        out.fma(sinTheta * Math.sin(phi), bitangent);
        return out;
    }

    /** 1 unless the emitter fits its body; point anchors always report 1. */
    private double bodyFactor() {
        return spec.fit() == ParticleDefinition.Fit.BODY ? anchor.bodyFactor() : 1;
    }

    /** Geometry multiplier: the body for body-fit emitters, otherwise the instance's data.scale. */
    private double geometryFactor() {
        return spec.fit() == ParticleDefinition.Fit.BODY ? anchor.bodyFactor() : instanceScale;
    }

    private void collectTrailPoints(List<Vector3d> out) {
        double minDistance = spec.trailMinDistance() == null ? 0 : spec.trailMinDistance() * geometryFactor();
        if (history.size() < 2 || !(minDistance > 0)) return;
        Vector3d newer = new Vector3d();
        Vector3d older = new Vector3d();
        if (!history.position(0, newer) || !history.position(1, older)) return;
        double dx = newer.x - older.x, dy = newer.y - older.y, dz = newer.z - older.z;
        double length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length <= 1e-12) return;
        double offset = minDistance - trailCarry;
        if (offset < 0) offset = 0;
        double lastPlaced = Double.NaN;
        while (offset <= length + 1e-9) {
            out.add(new Vector3d(older).lerp(newer, offset / length));
            lastPlaced = offset;
            offset += minDistance;
        }
        trailCarry = Double.isNaN(lastPlaced) ? Math.min(trailCarry + length, minDistance) : length - lastPlaced;
        if (trailCarry >= minDistance) trailCarry = 0;
        if (trailCarry < 0) trailCarry = 0;
    }
}
