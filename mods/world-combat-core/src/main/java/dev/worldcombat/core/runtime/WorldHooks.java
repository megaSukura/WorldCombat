package dev.worldcombat.core.runtime;

import dev.worldcombat.core.runtime.effect.*;
import java.util.*;
import java.util.function.Consumer;

/** Named host facts. Content owns the reactions and their ordering dependencies. */
public final class WorldHooks {
    record Hook(String id, String topic, Set<String> after, Consumer<WorldEvent> callback) {}
    public record Result(String data, String rejection) {}
    private final Map<String, Hook> hooks = new LinkedHashMap<>();
    private final Set<String> disabled = new HashSet<>();
    private final Map<String, Integer> enabledTopics = new HashMap<>();
    private List<String> order = List.of();
    private long epoch;
    private boolean loading;
    private int depth;
    public void begin(long epoch) { this.epoch = epoch; loading = true; hooks.clear(); disabled.clear(); enabledTopics.clear(); order = List.of(); }
    public void register(long expected, String id, String topic, String after, Consumer<WorldEvent> callback) {
        if (!loading || expected != epoch) throw new IllegalStateException("Register in the current script load");
        EffectData.id(id); EffectData.id(topic); var dependencies = new LinkedHashSet<String>();
        if (!after.isBlank()) for (String parent : after.split(",")) dependencies.add(EffectData.id(parent.trim()));
        if (callback == null || hooks.putIfAbsent(id, new Hook(id, topic, dependencies, callback)) != null) throw new IllegalArgumentException("Duplicate host hook");
        enabledTopics.merge(topic, 1, Integer::sum);
    }
    public void complete(boolean success) {
        loading = false;
        if (!success) { order = List.of(); return; }
        var graph = new LinkedHashMap<String, Set<String>>(); hooks.forEach((id, hook) -> graph.put(id, hook.after()));
        order = EffectRegistry.sort(graph);
    }
    public boolean has(String topic) { return enabledTopics.getOrDefault(topic, 0) > 0; }
    public Result emit(ActionRuntime runtime, String topic, ActorHandle actor, ActorHandle target, String data, ActionContext action, boolean writable) {
        runtime.host.checkThread();
        if (!runtime.content.ready() || runtime.content.epoch() != epoch) return new Result(data, "");
        if (++depth > 12) { depth--; throw new IllegalStateException("Host reaction depth exceeded"); }
        try {
            for (String id : order) {
                var hook = hooks.get(id);
                if (disabled.contains(id) || !hook.topic().equals(topic)) continue;
                try (var event = new WorldEvent(runtime, topic, actor, target, data, action, writable)) {
                    long started = ScriptProfile.start();
                    try {
                        hook.callback().accept(event); data = event.result();
                        if (!event.rejection().isEmpty()) return new Result(data, event.rejection());
                    } catch (RuntimeException error) {
                        Throwable cause = error;
                        for (int i = 0; cause != null && i < 8; i++, cause = cause.getCause()) {
                            if (cause instanceof ActionInactiveException) return new Result(data, "actor-left");
                            if (cause instanceof ActionRejectedException rejected) return new Result(data, rejected.reason());
                        }
                        if (disabled.add(id)) enabledTopics.merge(hook.topic(), -1, Integer::sum);
                        runtime.host.report(0, id, "host-hook-disabled", error);
                        return new Result(data, "script-error");
                    } finally { ScriptProfile.end("hook " + topic + " " + id, started); }
                }
            }
            return new Result(data, "");
        } finally { depth--; }
    }
}
