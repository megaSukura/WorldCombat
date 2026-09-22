package dev.worldcombat.core.runtime;

import java.util.*;
import java.util.function.Consumer;

/** Server-driven transient runtime. No game classes or scripting-engine objects in its state values. */
public final class ActionRuntime {

    final CombatHost host;
    final ContentRegistry content;
    private final dev.worldcombat.core.runtime.effect.EffectRuntime effects;
    private final ManagedProjectiles projectiles;
    final Map<Long, ActionContext> instances = new LinkedHashMap<>();
    private final Map<String, Long> cooldowns = new HashMap<>();
    private final Map<String, State> recent = new LinkedHashMap<>();
    private record Retired(ActorHandle actor, State state, long until) {}
    private final Map<Long, Retired> retired = new LinkedHashMap<>();
    private long nextId;
    private long tick;
    private long epoch;
    private int startDepth;
    private final Set<String> settling = new HashSet<>();
    private final Set<ActorHandle> cancelling = new HashSet<>();
    private boolean resetting;
    private record NativeCallback(ActionContext action, Consumer<ActionContext> callback) {}
    private final List<NativeCallback> nativeCallbacks = new ArrayList<>();
    void defer(ActionContext action, Consumer<ActionContext> callback) {
        host.checkThread();
        if (isCurrent(action)) nativeCallbacks.add(new NativeCallback(action, callback));
    }

    public ActionRuntime(CombatHost host, ContentRegistry content) {
        this.host = host;
        this.content = content;
        projectiles = new ManagedProjectiles(host);
        effects = new dev.worldcombat.core.runtime.effect.EffectRuntime(host, content.effects());
        effects.attach(this);
        epoch = content.epoch();
    }

    public synchronized long start(String id, ActorHandle actor, ActorHandle target, UUID controller) {
        host.checkThread();
        if (!host.valid(target)) throw new ActionRejectedException("target-left");
        return start(id, actor, ActionTarget.entity(target, host.position(target), new Point(0, 0, 1)), controller);
    }

    public synchronized long start(String id, ActorHandle actor, ActionTarget target, UUID controller) {
        return start(id, actor, target, controller, Map.of());
    }

    public synchronized long start(String id, ActorHandle actor, ActionTarget target, UUID controller, Map<String, String> arguments) {
        return start(id, actor, target, controller, arguments, 0, false);
    }
    private long start(String id, ActorHandle actor, ActionTarget target, UUID controller, Map<String, String> arguments, long parent, boolean linked) {
        host.checkThread();
        if (++startDepth > 16) { startDepth--; throw new ActionRejectedException("invocation-depth"); }
        try { return startInstance(id, actor, target, controller, arguments, parent, linked); }
        finally { startDepth--; }
    }
    private long startInstance(String id, ActorHandle actor, ActionTarget target, UUID controller, Map<String, String> arguments, long parent, boolean linked) {
        if (resetting || cancelling.contains(actor)) throw new ActionRejectedException("actor-unavailable");
        ActionDefinition definition = validateInput(id, actor, target, controller);
        target = effectiveTarget(definition, actor, target);
        if (arguments == null) throw new IllegalArgumentException("Invalid action arguments");
        arguments.forEach((key, value) -> {
            if (key == null || !key.matches("[a-zA-Z0-9_:.-]{1,64}") || value == null)
                throw new IllegalArgumentException("Invalid action argument");
        });
        var spec = content.preview(id).input();
        String implied = ActionInput.implied(arguments.get(ActionInput.KEY), spec, target, actor, host);
        if (!Objects.equals(implied, arguments.get(ActionInput.KEY))) { arguments = new HashMap<>(arguments); arguments.put(ActionInput.KEY, implied); }
        ActionInput.validate(arguments.get(ActionInput.KEY), spec, definition.range(), actor, host, effects);
        if (cooldown(actor, id) > 0) throw new ActionRejectedException("cooldown");
        if (!conflicts(actor, definition).isEmpty()) throw new ActionRejectedException("busy");
        if (spec.sustained() && !definition.composition().owns("input")) throw new ActionRejectedException("input-claim-required");
        var context = new ActionContext(this, ++nextId, definition, actor, target, controller, arguments, tick, epoch);
        context.parent = parent; context.linked = linked;
        instances.put(context.id(), context);
        remember(context, "preparing", "");
        invoke(context, c -> { if (definition.composition().steers()) host.begin(c.id(), actor); definition.start().accept(c); });
        if (linked && !instances.containsKey(parent)) finish(context, "parent-ended");
        if (content.get(id) == null) throw new ActionRejectedException("script-error");
        if (context.rejection != null) throw new ActionRejectedException(context.rejection);
        return context.id();
    }

    public synchronized ActionDefinition validateInput(String id, ActorHandle actor, ActionTarget target, UUID controller) {
        return validateInput(id, actor, target, controller, false);
    }
    /** An approach order checks identity and allegiance now; execution still validates its actual casting range. */
    public synchronized ActionDefinition validateInput(String id, ActorHandle actor, ActionTarget target, UUID controller, boolean approaching) {
        host.checkThread();
        checkEpoch();
        ActionDefinition definition = content.get(id);
        if (definition == null) throw new ActionRejectedException("content-unavailable");
        if (!host.valid(actor) || !host.mayAct(actor, controller)) throw new ActionRejectedException("actor-left");
        if (!definition.actorDomain().equals("*") && !definition.actorDomain().equals(actor.domain()))
            throw new ActionRejectedException("wrong-domain");
        validateTarget(definition.targetKind(), approaching ? Double.POSITIVE_INFINITY : definition.range(), actor, effectiveTarget(definition, actor, target));
        return definition;
    }

    public record StartResult(long instance, String reason) { public boolean accepted() { return instance > 0; } }
    StartResult child(ActionContext parent, String id, ActionTarget target, Map<String, String> arguments, String lifetime) {
        requireCurrent(parent);
        if (!parent.committed || parent.committing) throw new IllegalStateException("Commit before starting a child action");
        if (!Set.of("linked", "independent").contains(lifetime)) throw new IllegalArgumentException("Invalid child lifetime");
        try { return new StartResult(start(id, parent.actor(), target, parent.controller(), arguments, parent.id(), lifetime.equals("linked")), ""); }
        catch (ActionRejectedException rejected) { return new StartResult(0, rejected.reason()); }
    }

    private ActionTarget effectiveTarget(ActionDefinition definition, ActorHandle actor, ActionTarget target) {
        if (target == null) throw new ActionRejectedException("invalid-target");
        return definition.targetKind().equals("self")
            ? ActionTarget.entity(actor, host.position(actor), target.direction()) : target;
    }

    private void validateTarget(ActionDefinition definition, ActorHandle actor, ActionTarget target) {
        validateTarget(definition.targetKind(), definition.range(), actor, target);
    }
    void validateTarget(String kind, double range, ActorHandle actor, ActionTarget target) {
        if (kind == null || !Set.of("enemy", "friend", "aim", "point", "motion", "self").contains(kind))
            throw new IllegalArgumentException("Invalid target kind");
        if (target == null) throw new ActionRejectedException("invalid-target");
        boolean entity = target.entity() != null;
        if (entity && (!host.valid(target.entity()) || !host.sameWorld(actor, target.entity())))
            throw new ActionRejectedException("target-left");
        if ((kind.equals("enemy") || kind.equals("friend")) && !entity
            || kind.equals("point") && !target.kind().equals("point")
            || kind.equals("motion") && entity)
            throw new ActionRejectedException("invalid-target");
        if (entity && !kind.equals("self") && kind.equals("friend") != host.friendly(actor, target.entity()))
            throw new ActionRejectedException(kind.equals("friend") ? "choose-friend" : "choose-enemy");
        Point position = entity ? host.position(target.entity()) : target.point();
        if (!target.kind().equals("direction") && host.position(actor).minus(position).length() > range)
            throw new ActionRejectedException("out-of-range");
    }

    private List<ActionContext> active(ActorHandle actor) {
        return instances.values().stream().filter(it -> it.actor().equals(actor)).toList();
    }
    private List<ActionContext> conflicts(ActorHandle actor, ActionDefinition definition) {
        return active(actor).stream().filter(it -> it.definition.composition().conflicts(definition.composition())).toList();
    }
    private ActionContext foreground(ActorHandle actor) {
        var values = active(actor);
        for (String claim : List.of("input", "movement", "aim")) for (var value : values) if (value.definition.composition().owns(claim)) return value;
        return values.isEmpty() ? null : values.getFirst();
    }
    /** Readiness excludes target/cost policy, validated by callers and again at start/commit. */
    public synchronized String readiness(ActorHandle actor, String id) {
        host.checkThread(); checkEpoch();
        var definition = content.get(id);
        if (definition == null) return "content-unavailable";
        if (!host.valid(actor)) return "actor-left";
        if (!definition.actorDomain().equals("*") && !definition.actorDomain().equals(actor.domain())) return "wrong-domain";
        if (cooldown(actor, id) > 0) return "cooldown";
        return conflicts(actor, definition).isEmpty() ? "" : "busy";
    }
    public synchronized boolean claimed(ActorHandle actor, String claim) {
        return active(actor).stream().anyMatch(it -> it.definition.composition().owns(claim));
    }
    boolean controlAllowed(long owner, ActorHandle actor, String claim) {
        var action = instances.get(owner);
        if (action != null && action.actor().equals(actor)) {
            requireCurrent(action);
            if (!action.definition.composition().owns(claim)) throw new ActionRejectedException(claim + "-claim-required");
            return true;
        }
        return !claimed(actor, claim);
    }
    public synchronized boolean busy(ActorHandle actor) { return !active(actor).isEmpty(); }
    public synchronized long inputToken(ActorHandle actor, UUID controller) {
        host.checkThread();
        for (var context : active(actor)) {
            var spec = content.preview(context.definition.id()).input();
            if (context.definition.composition().owns("input") && spec.sustained() && Objects.equals(controller, context.controller()))
                return ActionInput.parse(context.controlJson, spec).token();
        }
        return 0;
    }
    public synchronized boolean control(ActorHandle actor, UUID controller, long token, String json, boolean stop) {
        host.checkThread(); var context = active(actor).stream().filter(it -> it.definition.composition().owns("input")).findFirst().orElse(null);
        if (context == null || !Objects.equals(context.controller(), controller) || !host.mayAct(actor, controller)) return false;
        var spec = content.preview(context.definition.id()).input();
        if (!spec.sustained() || token <= 0 || ActionInput.parse(context.argument(ActionInput.KEY), spec).token() != token) return false;
        if (stop) { finish(context, "input-stopped"); return true; }
        var input = ActionInput.validate(json, spec, context.definition.range(), actor, host, effects);
        if (input.token() != token) return false;
        context.controlJson = input.json(); context.controlTick = tick;
        return true;
    }
    /** Actor events broadcast to a stable snapshot; new instances wait for the next event. */
    public synchronized boolean deliver(ActorHandle actor, String event) {
        host.checkThread(); var actions = active(actor);
        for (var action : actions) invoke(action, context -> context.emit(event));
        return !actions.isEmpty();
    }
    public synchronized boolean deliver(ActorHandle actor, long instance, String event) {
        host.checkThread(); var action = instances.get(instance);
        if (action == null || !action.actor().equals(actor)) return false;
        invoke(action, context -> context.emit(event)); return true;
    }
    public synchronized boolean interruptPreparation(ActorHandle actor) {
        host.checkThread(); var action = foreground(actor);
        if (action == null) return true;
        return interruptPreparation(actor, action.id());
    }
    public synchronized boolean interruptPreparation(ActorHandle actor, long instance) {
        host.checkThread(); var action = instances.get(instance);
        if (action == null) return true;
        if (!action.actor().equals(actor)) return false;
        if (action.committed || action.committing) return false;
        finish(action, "replaced"); return true;
    }
    /** Replace only conflicting preparation instances; compatible work remains active. */
    public synchronized boolean interruptPreparation(ActorHandle actor, String incoming) {
        host.checkThread(); checkEpoch(); var definition = content.get(incoming);
        if (definition == null) return false;
        var values = conflicts(actor, definition);
        if (values.stream().anyMatch(it -> it.committed || it.committing)) return false;
        for (var action : values) finish(action, "replaced");
        return true;
    }
    /** Ends all actions on this actor through their ordinary cleanup path. */
    public synchronized boolean interrupt(ActorHandle actor, String reason) {
        host.checkThread(); dev.worldcombat.core.runtime.effect.EffectData.id(reason);
        var actions = active(actor);
        for (var action : actions) finish(action, reason);
        return !actions.isEmpty();
    }
    public synchronized boolean interrupt(ActorHandle actor, long instance, String reason) {
        host.checkThread(); dev.worldcombat.core.runtime.effect.EffectData.id(reason);
        var action = instances.get(instance);
        if (action == null || !action.actor().equals(actor)) return false;
        finish(action, reason); return true;
    }
    public synchronized State state(ActorHandle actor) { var current = foreground(actor); return current == null ? recent.get(actor.key()) : current.state; }
    public synchronized State state(ActorHandle actor, long instance) {
        var current = instances.get(instance); return current != null && current.actor().equals(actor) ? current.state : null;
    }
    public synchronized State[] states(ActorHandle actor) { return active(actor).stream().map(it -> it.state).toArray(State[]::new); }
    /** Terminal receipts last one maximum action lifetime (1200 ticks), scoped to the exact actor binding. */
    public synchronized State result(ActorHandle actor, long instance) {
        host.checkThread(); var current = state(actor, instance); if (current != null) return current;
        var ended = retired.get(instance); return ended != null && ended.actor.equals(actor) ? ended.state : null;
    }
    public synchronized boolean exists(long instance) { host.checkThread(); var current = instances.get(instance); return current != null && isCurrent(current); }
    public record State(long instance, String action, String stage, String reason, boolean committed, long parent, String lifetime) {}
    void remember(ActionContext context, String stage, String reason) {
        context.state = new State(context.id(), context.definition.id(), stage, reason, context.committed, context.parent,
            context.parent == 0 ? "root" : context.linked ? "linked" : "independent");
        recent.put(context.actor().key(), context.state);
    }

    public synchronized void tick() {
        host.checkThread();
        tick++;
        checkEpoch();
        effects.tick();
        projectiles.tick();
        var callbacks = List.copyOf(nativeCallbacks);
        nativeCallbacks.clear();
        for (var callback : callbacks) invoke(callback.action, callback.callback);
        cooldowns.entrySet().removeIf(entry -> entry.getValue() <= tick);
        retired.entrySet().removeIf(entry -> entry.getValue().until <= tick);
        for (var context : List.copyOf(instances.values())) {
            if (!isCurrent(context)) continue;
            var spec = content.preview(context.definition.id()).input();
            if (spec.sustained() && ActionInput.parse(context.argument(ActionInput.KEY), spec).token() > 0 && tick - context.controlTick > 15) {
                finish(context, "input-timeout"); continue;
            }
            if (!host.valid(context.actor()) || !host.mayAct(context.actor(), context.controller())) {
                finish(context, "actor-left");
                continue;
            }
            if (context.requiresTarget() && (!host.valid(context.target()) || !host.sameWorld(context.actor(), context.target()))) {
                finish(context, "target-left");
                continue;
            }
            if (tick - context.born >= context.definition.maxTicks()) {
                finish(context, "expired");
                continue;
            }
            // Removing before invoking makes reentrant cancellation and scheduling deterministic.
            var due = context.tasks.stream().filter(task -> task.at() <= tick).toList();
            context.tasks.removeAll(due);
            for (var task : due) {
                if (!isCurrent(context)) break;
                invoke(context, task.callback());
            }
        }
    }

    public synchronized void cancelActor(ActorHandle actor, String reason) {
        host.checkThread();
        if (!cancelling.add(actor)) return;
        try {
            for (var context : List.copyOf(instances.values())) if (context.actor().equals(actor)) finish(context, reason);
            recent.remove(actor.key());
            retired.entrySet().removeIf(entry -> entry.getValue().actor.equals(actor));
        } finally { cancelling.remove(actor); }
    }

    public synchronized void cancelTarget(ActorHandle target, String reason) {
        host.checkThread();
        for (var context : List.copyOf(instances.values()))
            if (context.requiresTarget() && target.equals(context.target())) finish(context, reason);
    }
    public synchronized void reset(String reason) {
        host.checkThread(); if (resetting) return; resetting = true;
        try {
            for (var context : List.copyOf(instances.values())) finish(context, reason);
            epoch = content.epoch(); effects.reload(); nativeCallbacks.clear(); retired.clear();
        } finally { resetting = false; }
    }

    public synchronized void stop() {
        reset("server-stopped");
        effects.stop();
        cooldowns.clear();
        recent.clear();
    }

    public synchronized long cooldown(ActorHandle actor, String id) {
        return Math.max(0, cooldowns.getOrDefault(actor.key() + "/" + id, 0L) - tick);
    }

    void commit(ActionContext context, int cooldown) {
        requireCurrent(context);
        if (context.committed || context.committing) throw new IllegalStateException("Action already committing or committed");
        if (cooldown(context.actor(), context.definition.id()) > 0) throw new ActionRejectedException("cooldown");
        validateTarget(context.targetKind(), context.range(), context.actor(), context.input());
        if (!context.retargeted) ActionInput.validate(context.controlJson, content.preview(context.definition.id()).input(), context.definition.range(), context.actor(), host, effects);
        if (cooldown < 0 || cooldown > 12000) throw new IllegalArgumentException("Cooldown must be 0..12000 ticks");
        if (!settling.add(context.actor().key())) throw new ActionRejectedException("transaction-busy");
        var attempted = new ArrayList<CommitCost>();
        context.committing = true;
        try {
            var gate = content.hooks().emit(this, "world_combat:before_commit", context.actor(), context.target(), "{}", context, false);
            if (!gate.rejection().isEmpty()) {
                context.rejectionData = gate.data();
                throw new ActionRejectedException(gate.rejection());
            }
            requireCurrent(context);
            var costs = List.copyOf(context.costs.values());
            for (var cost : costs) {
                context.settlingCost = cost; context.costPhase = "prepare";
                cost.prepare(context);
            }
            requireCurrent(context);
            for (var cost : costs) {
                attempted.add(cost);
                context.settlingCost = cost; context.costPhase = "apply";
                cost.apply();
                requireCurrent(context);
            }
        } catch (RuntimeException failure) {
            IllegalStateException rollbackFailure = null;
            for (int index = attempted.size() - 1; index >= 0; index--) {
                try {
                    context.settlingCost = attempted.get(index); context.costPhase = "rollback";
                    attempted.get(index).rollback();
                } catch (RuntimeException rollback) {
                    if (rollbackFailure == null) {
                        rollbackFailure = new IllegalStateException("Resource rollback failed");
                        rollbackFailure.addSuppressed(failure);
                    }
                    rollbackFailure.addSuppressed(rollback);
                }
            }
            if (rollbackFailure != null) throw rollbackFailure;
            throw failure;
        } finally {
            context.committing = false;
            settling.remove(context.actor().key());
            context.settlingCost = null; context.costPhase = null;
        }
        context.committed = true;
        context.costs.clear();
        remember(context, "executing", "");
        var cooldownKey = context.actor().key() + "/" + context.definition.id();
        if (cooldown == 0) cooldowns.remove(cooldownKey);
        else cooldowns.put(cooldownKey, tick + cooldown);
        host.report(context.id(), context.definition.id(), "committed", null);
        host.committed(context);
        content.hooks().emit(this, "world_combat:committed", context.actor(), context.target(), "{}", context, true);
    }

    void invoke(ActionContext context, Consumer<ActionContext> callback) {
        if (!isCurrent(context)) return;
        long started = ScriptProfile.start();
        try {
            requireCurrent(context);
            callback.accept(context);
        } catch (ActionRejectedException rejected) {
            rejected(context, rejected.reason());
        } catch (ActionInactiveException ended) {
            finish(context, "action-invalidated");
        } catch (RuntimeException error) {
            Throwable nested = error;
            for (int depth = 0; depth < 8 && nested != null; depth++, nested = nested.getCause()) {
                if (nested instanceof ActionRejectedException rejected) {
                    rejected(context, rejected.reason()); return;
                }
                if (nested instanceof ActionInactiveException) { finish(context, "action-invalidated"); return; }
            }
            // One bad cast ends this instance and is reported; the move stays available. Repeated failures
            // in a short window disable the definition so a broken script cannot spam every tick.
            boolean disabled = content.failed(context.definition.id(), tick);
            context.rejection = "script-error";
            finish(context, "script-error");
            host.report(context.id(), context.definition.id() + "@" + context.definition.version(), disabled ? "disabled" : "script-error", error);
        } finally { ScriptProfile.end("action " + context.definition.id(), started); }
    }

    void requireCurrent(ActionContext context) {
        host.checkThread();
        if (!isCurrent(context) || !host.valid(context.actor()) || !host.mayAct(context.actor(), context.controller()))
            throw new ActionInactiveException("Action instance has ended or actor left");
    }

    boolean isCurrent(ActionContext context) {
        return instances.get(context.id()) == context && context.epoch == content.epoch()
            && content.get(context.definition.id()) == context.definition;
    }

    private void rejected(ActionContext context, String reason) {
        if (!instances.containsKey(context.id())) return;
        context.rejection = reason;
        var data = new com.google.gson.JsonObject();
        data.addProperty("action", context.id()); data.addProperty("content", context.definition.id());
        data.addProperty("reason", reason); data.addProperty("committed", context.committed);
        data.add("details", com.google.gson.JsonParser.parseString(context.rejectionData));
        // Rollback has completed. Release the failed action first; reactions have their own writable lifecycle.
        finish(context, reason);
        if (host.valid(context.actor()))
            content.hooks().emit(this, "world_combat:action_rejected", context.actor(), context.target(), data.toString(), null, true);
    }

    void finish(ActionContext context, String reason) {
        if (instances.remove(context.id(), context)) {
            projectiles.release(context.id());
            for (var child : List.copyOf(instances.values())) if (child.parent == context.id() && child.linked) finish(child, "parent-ended");
            effects.actionEnded(context.id());
            remember(context, reason.equals("finished") ? "finished" : "cancelled", reason);
            retired.put(context.id(), new Retired(context.actor(), context.state, tick + 1200));
            host.release(context.id(), reason);
            if (context.definition.composition().steers() && !claimed(context.actor(), "movement") && !claimed(context.actor(), "aim")) host.stopMovement(context.actor());
            context.release();
            host.report(context.id(), context.definition.id(), reason, null);
        }
    }

    private void checkEpoch() {
        if (epoch != content.epoch() || !content.ready()) reset("content-reloaded");
        for (var context : List.copyOf(instances.values()))
            if (!isCurrent(context)) finish(context, "content-unavailable");
    }

    public long now() { return tick; }
    public ManagedProjectiles projectiles() { return projectiles; }
    public ContentRegistry content() { return content; }
    public dev.worldcombat.core.runtime.effect.EffectRuntime effects() { return effects; }
    public WorldHooks.Result event(String topic, ActorHandle actor, ActorHandle target, String data, boolean writable) {
        return content.hooks().emit(this, topic, actor, target, data, null, writable);
    }

    public synchronized Stats stats() {
        return new Stats(instances.size(), instances.values().stream().mapToInt(c -> c.tasks.size()).sum(),
            instances.values().stream().mapToInt(c -> c.listeners.size()).sum(), cooldowns.size());
    }

    public record Stats(int instances, int tasks, int listeners, int cooldowns) {}
}
