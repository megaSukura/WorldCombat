package dev.worldcombat.core.runtime;

import dev.worldcombat.core.runtime.effect.EffectData;

/** A synchronous host observation with callback-scoped capabilities and a bounded data envelope. */
public final class WorldEvent implements AutoCloseable {
    private final String topic;
    private final ActorHandle actor, target;
    private final ActionContext action;
    private final WorldAccess world;
    private boolean open = true;
    private String data, rejection = "";
    WorldEvent(ActionRuntime runtime, String topic, ActorHandle actor, ActorHandle target, String data, ActionContext action, boolean writable) {
        this(runtime, topic, actor, target, data, action, writable, null);
    }
    WorldEvent(ActionRuntime runtime, String topic, ActorHandle actor, ActorHandle target, String data, ActionContext action, boolean writable, ExecutionOrigin origin) {
        this.topic = topic; this.actor = actor; this.target = target; this.data = EffectData.copy(data); this.action = action;
        world = new WorldAccess(runtime, actor, action == null ? null : action.controller(), this::check, writable, action == null ? 0 : action.id(), origin);
    }
    private void check() { if (!open) throw new ActionInactiveException("Host event callback returned"); }
    public String topic() { check(); return topic; }
    public ActorHandle actor() { check(); return actor; }
    public ActorHandle target() { check(); return target; }
    public ActionContext action() { check(); return action; }
    public WorldAccess world() { check(); return world; }
    public String data() { check(); return data; }
    public void data(String value) { check(); data = EffectData.copy(value); }
    public void reject(String reason) { check(); if (reason == null || reason.isBlank() || reason.length() > 128) throw new IllegalArgumentException("Invalid refusal"); rejection = reason; }
    String rejection() { return rejection; }
    String result() { return data; }
    public void close() { open = false; }
}
