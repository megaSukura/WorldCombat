package dev.worldcombat.core.runtime;

import java.util.*;
import java.util.function.Consumer;

public final class ActionContext {
    private final ActionRuntime runtime;
    private final long id;
    final ActionDefinition definition;
    private final ActorHandle actor;
    private ActionTarget input;
    private String targetKind;
    private double targetRange;
    boolean retargeted;
    private Point lastTargetPosition;
    private boolean targetReleased;
    private final UUID controller;
    private final Map<String, String> arguments;
    private final Map<String, String> scriptData = new LinkedHashMap<>();
    final long born;
    final long epoch;
    String controlJson;
    long controlTick;
    public String control() { valid(); return controlJson; }
    boolean committed;
    boolean committing;
    long parent;
    boolean linked;
    ActionRuntime.State state;
    CommitCost settlingCost;
    String costPhase;
    final Map<String, CommitCost> costs = new LinkedHashMap<>();
    String rejection;
    String rejectionData = "{}";
    private int depth;
    private int nextListener;
    private WorldAccess world;
    private WorldAccess senses;
    public WorldAccess sense() { valid(); if (senses == null) senses = new WorldAccess(runtime, actor, controller, this::valid, false, id); return senses; }
    final List<Task> tasks = new ArrayList<>();
    final Map<Integer, Listener> listeners = new LinkedHashMap<>();
    private final Set<Impact> traces = Collections.newSetFromMap(new IdentityHashMap<>());
    private final Set<String> damaged = new HashSet<>();

    ActionContext(ActionRuntime runtime, long id, ActionDefinition definition, ActorHandle actor,
                  ActionTarget input, UUID controller, Map<String, String> arguments, long born, long epoch) {
        this.runtime = runtime; this.id = id; this.definition = definition; this.actor = actor;
        this.input = input; this.controller = controller; this.born = born; this.epoch = epoch;
        targetKind = definition.targetKind(); targetRange = definition.range();
        lastTargetPosition = input.point();
        this.arguments = Map.copyOf(arguments);
        controlJson = arguments.getOrDefault(ActionInput.KEY, "{}"); controlTick = born;
    }

    public long id() { return id; }
    public long parent() { return parent; }
    public ActionRuntime.StartResult child(String action, ActorHandle target, Point point, Point direction, String arguments, String lifetime) {
        return runtime.child(this, action, target == null ? ActionTarget.point(point, direction) : ActionTarget.entity(target, point, direction), WorldAccess.arguments(arguments), lifetime);
    }
    /** Content id of the definition behind this action. */
    public String content() { return definition.id(); }
    public ActorHandle actor() { return actor; }
    public ActorHandle target() { return input.entity(); }
    public ActionTarget input() { return input; }
    public Point direction() { return input.direction(); }
    public double range() { return targetRange; }
    public String targetKind() { return targetKind; }
    /** Replaces preparation input within the registered range, retaining the action's transaction and lifetime. */
    public void retarget(String kind, ActorHandle target, Point point, Point direction, double range) {
        valid();
        if (committed || committing) throw new IllegalStateException("Retarget before commitment");
        if (!Double.isFinite(range) || range < 0 || range == 0 && !"self".equals(kind) || range > definition.range()) throw new IllegalArgumentException("Invalid target range");
        var candidate = target == null ? ActionTarget.point(point, direction) : ActionTarget.entity(target, point, direction);
        if ("self".equals(kind)) candidate = ActionTarget.entity(actor, runtime.host.position(actor), direction);
        runtime.validateTarget(kind, range, actor, candidate);
        input = candidate; targetKind = kind; targetRange = range; lastTargetPosition = candidate.point(); targetReleased = false; retargeted = true;
    }
    public void stage(String stage) {
        valid();
        if (stage == null || !stage.matches("[a-z][a-z0-9_:./-]{0,31}"))
            throw new IllegalArgumentException("Invalid action stage");
        runtime.remember(this, stage, "");
    }
    public void reject(String reason) { valid(); throw new ActionRejectedException(reason); }
    public UUID controller() { return controller; }
    public String argument(String key) { return arguments.get(key); }
    /** Transient, namespaced script state owned by this action, including its deferred callbacks. A bare key lives in the action's namespace. */
    private String dataKey(String key) {
        if (key != null && key.indexOf(':') < 0) key = definition.id().substring(0, definition.id().indexOf(':') + 1) + key;
        return dev.worldcombat.core.runtime.effect.EffectData.id(key);
    }
    public String data(String key) { valid(); return scriptData.get(dataKey(key)); }
    public void data(String key, String json) {
        valid(); key = dataKey(key);
        scriptData.put(key, dev.worldcombat.core.runtime.effect.EffectData.copy(json));
    }

    public Point origin() { valid(); return runtime.host.position(actor); }
    public Point targetPosition() {
        valid();
        if (input.entity() != null) {
            if (targetReleased) return lastTargetPosition;
            if (!runtime.host.valid(input.entity())) throw new ActionInactiveException("Target left");
            return lastTargetPosition = runtime.host.position(input.entity());
        }
        return input.kind().equals("direction") ? origin().plus(input.direction().scale(range())) : input.point();
    }

    /** Content can finish a committed action independently of its original target. Its handle stays observational. */
    public void releaseTarget() {
        valid();
        if (!committed) throw new IllegalStateException("Commit before releasing target dependency");
        if (targetReleased) return;
        if (input.entity() != null && runtime.host.valid(input.entity()) && runtime.host.sameWorld(actor, input.entity()))
            lastTargetPosition = runtime.host.position(input.entity());
        targetReleased = true;
    }
    boolean requiresTarget() { return input.entity() != null && !targetReleased; }

    public void commit(int cooldownTicks) { runtime.commit(this, cooldownTicks); }

    public void cost(CommitCost cost) {
        valid();
        if (committed || committing) throw new IllegalStateException("Attach costs before commitment");
        if (cost == null || cost.key() == null || cost.key().isBlank() || cost.key().length() > 256)
            throw new IllegalArgumentException("Invalid resource key");
        if (costs.containsKey(cost.key())) throw new IllegalArgumentException("Duplicate resource cost");
        costs.put(cost.key(), cost);
    }

    /** Resource adapters use this guard before native access, including rollback after invalidation. */
    public void checkCostAccess(CommitCost cost, String phase) {
        runtime.host.checkThread();
        if (!committing || settlingCost != cost || !Objects.equals(costPhase, phase))
            throw new IllegalStateException("Resource access is outside its commit transaction");
    }

    public void after(int ticks, Consumer<ActionContext> callback) {
        valid();
        if (ticks < 1 || ticks > 1200 || callback == null) throw new IllegalArgumentException("Invalid scheduled callback");
        tasks.add(new Task(runtime.now() + ticks, callback));
    }

    public int on(String event, Consumer<ActionContext> callback) {
        valid();
        if (event == null || event.isBlank() || event.length() > 64 || callback == null)
            throw new IllegalArgumentException("Invalid event listener");
        int token = ++nextListener;
        listeners.put(token, new Listener(event, callback));
        return token;
    }

    public void off(int token) { valid(); listeners.remove(token); }

    public void emit(String event) {
        valid();
        if (++depth > 16) { depth--; throw new IllegalStateException("Event depth exceeded"); }
        try {
            for (var entry : List.copyOf(listeners.entrySet())) {
                if (!runtime.isCurrent(this)) break;
                if (listeners.get(entry.getKey()) == entry.getValue() && entry.getValue().event().equals(event))
                    runtime.invoke(this, entry.getValue().callback());
            }
        } finally { depth--; }
    }

    /** Sweeps a capsule from `from` to `to`. Radius is capped at one block (wide bodies keep working); a long line is walked in
     *  four-block pieces and stops at the first hit, so the caller never has to split it. */
    public Impact trace(Point from, Point to, double radius) {
        valid();
        if (!committed) throw new IllegalStateException("Commit before world effects");
        if (!Double.isFinite(radius) || radius < 0) throw new IllegalArgumentException("Trace radius must be a non-negative number");
        radius = Math.min(1, radius);
        double length = from.minus(to).length();
        if (length > 64) throw new IllegalArgumentException("Trace at most 64 blocks");
        nearby(from); nearby(to);
        int pieces = Math.max(1, (int) Math.ceil(length / 4 - 1e-7));
        Impact result = null;
        for (int i = 0; i < pieces; i++) {
            Point start = i == 0 ? from : from.plus(to.minus(from).scale((double) i / pieces));
            Point end = i == pieces - 1 ? to : from.plus(to.minus(from).scale((double) (i + 1) / pieces));
            result = runtime.host.trace(actor, controller, start, end, radius);
            if (result.hitEntity() || result.blocked()) break;
        }
        if (result.hitEntity()) {
            traces.add(result);
        }
        return result;
    }

    /** Native physics and tracking; script callbacks resume at the runtime's safe tick boundary. */
    public String projectile(Point origin, Point velocity, double gravity, double radius, double range, int lifetime,
                             java.util.function.BiConsumer<ActionContext, Impact> hit, Consumer<ActionContext> complete) {
        return projectile(origin, velocity, gravity, radius, range, lifetime, hit, complete, "{}");
    }
    /** The trailing data object declares native flight options and an {@link Appearance}. */
    public String projectile(Point origin, Point velocity, double gravity, double radius, double range, int lifetime,
                             java.util.function.BiConsumer<ActionContext, Impact> hit, Consumer<ActionContext> complete, String data) {
        worldEffect();
        nearby(origin); releaseTarget();
        if (hit == null || complete == null) throw new IllegalArgumentException("Projectile needs callbacks");
        return runtime.projectiles().spawn(id, actor, controller, () -> runtime.isCurrent(this), origin, velocity, gravity, radius, range, lifetime,
            (projectile, impact) -> runtime.invoke(this, current -> {
                if (impact.hitEntity()) traces.add(impact);
                try { hit.accept(current, impact); } finally { traces.remove(impact); }
            }), projectile -> runtime.invoke(this, complete), data);
    }

    public boolean damage(Impact impact, double amount) {
        return hit(impact, amount, "primary");
    }
    public boolean hit(Impact impact, double amount, String strike) {
        return hit(impact, amount, strike, "{}");
    }
    public boolean hit(Impact impact, double amount, String strike, String metadata) {
        valid();
        if (!committed || !traces.remove(impact)) return false;
        if (strike == null || !strike.matches("[a-zA-Z0-9_.:-]{1,64}")) throw new IllegalArgumentException("Invalid strike identity");
        if (amount == 0) return false;
        NativeAmounts.positive(amount);
        if (impact.target() == null) return !impact.projectile().isEmpty() && damaged.add(strike + "/" + impact.entity())
            && runtime.projectiles().hit(id, impact, amount, metadata);
        if (!runtime.host.valid(impact.target()) || !damaged.add(strike + "/" + impact.target().key())) return false;
        if (impact.target().equals(input.entity())) lastTargetPosition = runtime.host.position(impact.target());
        if (!impact.projectile().isEmpty()) return runtime.projectiles().hit(id, impact, amount, metadata);
        nearby(runtime.host.position(impact.target()));
        return runtime.host.damage(actor, impact.target(), controller, amount, dev.worldcombat.core.runtime.effect.EffectData.copy(metadata));
    }

    public String approach(double within, double speed) {
        valid();
        runtime.controlAllowed(id, actor, "movement");
        if (!Double.isFinite(within) || within < 0.5 || within > 8 || !Double.isFinite(speed) || speed < 0.1 || speed > 1.5)
            throw new IllegalArgumentException("Invalid navigation bounds");
        return runtime.host.navigate(actor, targetPosition(), within, speed);
    }
    public void stopMovement() { valid(); runtime.controlAllowed(id, actor, "movement"); runtime.host.stopMovement(actor); }
    /** Movement and telegraphs can begin during preparation, before gameplay effects commit. */
    public void face(Point point, double yawSpeed, double pitchSpeed) {
        valid(); runtime.controlAllowed(id, actor, "aim"); nearby(point); WorldAccess.validateTurn(yawSpeed, pitchSpeed);
        runtime.host.face(actor, point, yawSpeed, pitchSpeed);
    }
    public void present(String key, String type, int version, Point point, String data) {
        valid(); nearby(point);
        // The presentation key only has to be unique inside this action; a bare key lives in the action's own namespace.
        // Authors compose keys from ids, slots and actor refs, so any handler-safe characters are accepted.
        if (key != null && key.indexOf(':') < 0) key = definition.id().substring(0, definition.id().indexOf(':') + 1) + key;
        dev.worldcombat.core.runtime.effect.EffectData.key(key);
        dev.worldcombat.core.runtime.effect.EffectData.id(type);
        if (version < 1 || version > 1000 || data == null)
            throw new IllegalArgumentException("Invalid presentation");
        runtime.host.present(id, actor, key, type, version, point, dev.worldcombat.core.runtime.effect.EffectData.copy(data));
    }
    public WorldAccess world() {
        worldEffect();
        if (world == null) world = new WorldAccess(runtime, actor, controller, this::worldEffect, true, id);
        return world;
    }
    public long effect(String definition, ActorHandle target, String data, int ticks) {
        worldEffect();
        return runtime.effects().create(definition, actor, target, controller, id, data, ticks);
    }
    public String signal(String event, int version, ActorHandle target, String data) {
        worldEffect();
        return runtime.effects().emit(event, version, actor, target, controller, data, "action", id);
    }
    public boolean effectOperation(long effect, String operation, String data) {
        worldEffect();
        return runtime.effects().operate(effect, operation, actor, controller, data);
    }
    private void worldEffect() {
        valid();
        if (!committed) throw new IllegalStateException("Commit before world effects");
    }
    public void particle(Point point) {
        valid(); nearby(point);
        runtime.host.particle(actor, point);
    }

    public void finish() { valid(); runtime.finish(this, "finished"); }
    public void cancel() { valid(); runtime.finish(this, committed ? "cancelled-after-commit" : "cancelled"); }

    private void nearby(Point point) {
        if (point.minus(runtime.host.position(actor)).length() > 64)
            throw new IllegalArgumentException("World effect exceeds action range");
    }
    private void valid() { runtime.requireCurrent(this); }
    void release() { tasks.clear(); listeners.clear(); traces.clear(); damaged.clear(); costs.clear(); scriptData.clear(); }
    record Task(long at, Consumer<ActionContext> callback) {}
    record Listener(String event, Consumer<ActionContext> callback) {}
}
