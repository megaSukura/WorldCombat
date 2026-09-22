package dev.worldcombat.core.runtime.effect;

import dev.worldcombat.core.runtime.*;

/** A callback-scoped capability; retaining it cannot extend its mutation lifetime. */
public final class EffectContext {
    private final EffectRuntime runtime;
    private final EffectRuntime.Instance instance;
    private final String input;
    private final EffectRuntime.Frame event;
    private final ActorHandle caller;
    private final Impact impact;
    private final String projectile;
    private boolean open = true;
    private WorldAccess world;
    EffectContext(EffectRuntime runtime, EffectRuntime.Instance instance, String input, EffectRuntime.Frame event, ActorHandle caller) {
        this(runtime, instance, input, event, caller, null, "");
    }
    EffectContext(EffectRuntime runtime, EffectRuntime.Instance instance, String input, EffectRuntime.Frame event, ActorHandle caller, Impact impact, String projectile) {
        this.runtime = runtime; this.instance = instance; this.input = input; this.event = event; this.caller = caller;
        this.impact = impact; this.projectile = projectile;
    }
    public Impact impact() { check(); return impact; }
    public String projectileId() { check(); return projectile; }
    void check() { if (!open) throw new ActionInactiveException("Effect callback has returned"); runtime.require(instance); }
    void close() { open = false; }
    public long id() { check(); return instance.id; }
    public String reason() { check(); return instance.endReason; }
    public ActorHandle source() { check(); return instance.source; }
    public ActorHandle target() { check(); return instance.target; }
    public ActorHandle caller() { check(); return caller; }
    public String input() { check(); return input; }
    public String state() { check(); return instance.data; }
    public WorldAccess world() {
        check();
        if (runtime.actions == null) throw new IllegalStateException("No world host attached");
        if (world == null) world = new WorldAccess(runtime.actions, instance.source, instance.controller, this::check, true, -instance.id);
        return world;
    }
    public void state(String json) {
        check(); var next = runtime.registry.data(instance.definition, json);
        if (!next.equals(instance.data)) { instance.data = next; runtime.changed(instance); }
    }
    public long copyTo(ActorHandle source, ActorHandle target, String json, int ticks) {
        check(); return runtime.create(instance.definition.id(), source, target, instance.controller, instance.action, json, ticks);
    }
    public int remaining() { check(); return instance.remaining; }
    public void remaining(int ticks) { check(); EffectRuntime.duration(instance.definition, ticks); if (instance.remaining != ticks) { instance.remaining = ticks; runtime.changed(instance); } }
    public void schedule(String key, String handler, int ticks, String input) { check(); runtime.schedule(instance, key, handler, ticks, input); }
    public void unschedule(String key) { check(); instance.timers.remove(key); }
    public void listen(String event, String phase, String handler) { check(); runtime.listen(instance, event, phase, handler); }
    public void unlisten(String event, String phase, String handler) { check(); instance.listeners.remove(new EffectRuntime.Listener(event, phase, handler)); }
    public EffectEvent event() { check(); if (event == null) throw new IllegalStateException("This callback has no event"); return new EffectEvent(this, runtime, event); }
    public String emit(String event, int version, ActorHandle target, String payload) {
        check(); return runtime.emit(event, version, instance.source, target, instance.controller, payload, "effect", instance.id);
    }
    public void reject(String reason) {
        check();
        if (reason == null || reason.isBlank() || reason.length() > 128) throw new IllegalArgumentException("Invalid effect refusal");
        throw new ActionRejectedException(reason);
    }
    public void end() { check(); runtime.end(instance); }
}
