package dev.worldcombat.core.runtime.effect;

import dev.worldcombat.core.runtime.ActorHandle;

public final class EffectEvent {
    private final EffectContext context;
    private final EffectRuntime runtime;
    private final EffectRuntime.Frame frame;
    EffectEvent(EffectContext context, EffectRuntime runtime, EffectRuntime.Frame frame) {
        this.context = context; this.runtime = runtime; this.frame = frame;
    }
    public long id() { context.check(); return frame.id; }
    public String protocol() { context.check(); return frame.definition.id(); }
    public int version() { context.check(); return frame.definition.schema(); }
    public String phase() { context.check(); return frame.phase; }
    public String originKind() { context.check(); return frame.originKind; }
    public long origin() { context.check(); return frame.origin; }
    public long parent() { context.check(); return frame.parent; }
    public long root() { context.check(); return frame.chain.root; }
    public int depth() { context.check(); return frame.chain.depth; }
    public ActorHandle source() { context.check(); return frame.source; }
    public ActorHandle target() { context.check(); return frame.target; }
    public String payload() { context.check(); return frame.payload; }
    public void payload(String json) { context.check(); frame.payload = runtime.registry.data(frame.definition, json); }
    public void reject(String reason) {
        context.check();
        if (reason == null || reason.isBlank() || reason.length() > 128) throw new IllegalArgumentException("Invalid event refusal");
        frame.reason = reason;
    }
}
