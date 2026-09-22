package dev.worldcombat.core.runtime.effect;

import java.util.*;
import java.util.function.*;

/** Content owns schemas, stages and operations. This registry only validates their contracts. */
public final class EffectRegistry {
    public record Definition(String id, int schema, int maxTicks, String lifetime,
                             Function<String, String> normalize, BiFunction<Integer, String, String> migrate,
                             Map<String, Consumer<EffectContext>> handlers) {}
    public record Event(String id, int schema, Function<String, String> normalize,
                        Map<String, Set<String>> dependencies, List<String> order) {}
    private record Pack(String version, Map<String, String> dependencies) {}
    private final Map<String, Pack> packs = new LinkedHashMap<>();
    private final Map<String, Definition> definitions = new LinkedHashMap<>();
    private final Map<String, Event> events = new LinkedHashMap<>();
    private final Set<String> disabled = new HashSet<>();
    private long epoch;
    private boolean loading, ready;

    public void begin(long epoch) {
        this.epoch = epoch; loading = true; ready = false;
        packs.clear(); definitions.clear(); events.clear(); disabled.clear();
    }
    private void loading(long expected) {
        if (!loading || expected != epoch) throw new IllegalStateException("Register during the current script load");
    }
    public void pack(long expected, String id, String version, String dependencies) {
        loading(expected); EffectData.id(id);
        if (version == null || version.isBlank() || version.length() > 64) throw new IllegalArgumentException("Invalid package version");
        var json = com.google.gson.JsonParser.parseString(EffectData.copy(dependencies)).getAsJsonObject();
        Map<String, String> required = new LinkedHashMap<>();
        json.entrySet().forEach(entry -> {
            EffectData.id(entry.getKey());
            if (!entry.getValue().isJsonPrimitive() || !entry.getValue().getAsJsonPrimitive().isString())
                throw new IllegalArgumentException("Package dependencies require exact versions");
            required.put(entry.getKey(), entry.getValue().getAsString());
        });
        if (packs.putIfAbsent(id, new Pack(version, Map.copyOf(required))) != null)
            throw new IllegalArgumentException("Duplicate package " + id);
    }
    public void effect(long expected, String id, int schema, int maxTicks, String lifetime,
                       Function<String, String> normalize, BiFunction<Integer, String, String> migrate) {
        loading(expected); EffectData.id(id);
        if (schema < 1 || maxTicks < 1 || maxTicks > 1200000 || normalize == null || migrate == null
            || !Set.of("action", "actor", "persistent").contains(lifetime)) throw new IllegalArgumentException("Invalid effect contract");
        if (definitions.putIfAbsent(id, new Definition(id, schema, maxTicks, lifetime, normalize, migrate, new LinkedHashMap<>())) != null)
            throw new IllegalArgumentException("Duplicate effect " + id);
    }
    public void handler(long expected, String effect, String key, Consumer<EffectContext> handler) {
        loading(expected); EffectData.key(key);
        var definition = definitions.get(effect);
        if (definition == null || handler == null || definition.handlers().putIfAbsent(key, handler) != null)
            throw new IllegalArgumentException("Missing effect or duplicate handler " + effect + "/" + key);
    }
    public void event(long expected, String id, int schema, Function<String, String> normalize) {
        loading(expected); EffectData.id(id);
        if (schema < 1 || normalize == null || events.putIfAbsent(id,
                new Event(id, schema, normalize, new LinkedHashMap<>(), new ArrayList<>())) != null)
            throw new IllegalArgumentException("Invalid or duplicate event " + id);
    }
    public void phase(long expected, String event, String id, String after) {
        loading(expected); EffectData.id(id);
        var definition = events.get(event);
        if (definition == null) throw new IllegalArgumentException("Unknown event " + event);
        Set<String> dependencies = new LinkedHashSet<>();
        if (!after.isBlank()) for (String parent : after.split(",")) dependencies.add(EffectData.id(parent.trim()));
        if (definition.dependencies().putIfAbsent(id, dependencies) != null)
            throw new IllegalArgumentException("Duplicate event phase " + id);
    }
    public void complete(boolean success) {
        loading = false; ready = false;
        if (!success) return;
        for (var pack : packs.entrySet()) for (var dependency : pack.getValue().dependencies().entrySet()) {
            var present = packs.get(dependency.getKey());
            if (present == null || !present.version().equals(dependency.getValue()))
                throw new IllegalArgumentException("Package " + pack.getKey() + " requires " + dependency);
        }
        Map<String, Set<String>> graph = new LinkedHashMap<>();
        packs.forEach((id, pack) -> graph.put(id, pack.dependencies().keySet()));
        sort(graph);
        for (var definition : definitions.values())
            if (!definition.handlers().containsKey("start")) throw new IllegalArgumentException("Effect needs start handler: " + definition.id());
        for (var event : events.values()) {
            if (event.dependencies().isEmpty()) throw new IllegalArgumentException("Event has no phases: " + event.id());
            event.order().addAll(sort(event.dependencies()));
        }
        ready = true;
    }
    public static List<String> sort(Map<String, Set<String>> graph) {
        var result = new ArrayList<String>();
        for (var entry : graph.entrySet()) for (String parent : entry.getValue())
            if (!graph.containsKey(parent)) throw new IllegalArgumentException("Unknown dependency " + parent);
        while (result.size() < graph.size()) {
            var available = graph.keySet().stream().filter(id -> !result.contains(id) && result.containsAll(graph.get(id))).sorted().toList();
            if (available.isEmpty()) throw new IllegalArgumentException("Content dependency cycle: " + graph.keySet());
            result.addAll(available);
        }
        return result;
    }
    public String data(Definition definition, String json) { return EffectData.copy(definition.normalize().apply(EffectData.copy(json))); }
    public String data(Event event, String json) { return EffectData.copy(event.normalize().apply(EffectData.copy(json))); }
    public Definition get(String id) { return ready && !disabled.contains(id) ? definitions.get(id) : null; }
    public Event event(String id) { return ready ? events.get(id) : null; }
    public void disable(String id) { disabled.add(id); }
    public boolean contains(String id) { return definitions.containsKey(id); }
    public boolean ready() { return ready; }
    public long epoch() { return epoch; }
    public Set<String> packs() { return Set.copyOf(packs.keySet()); }
}
