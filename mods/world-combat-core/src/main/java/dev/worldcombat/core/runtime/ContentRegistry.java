package dev.worldcombat.core.runtime;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public final class ContentRegistry {
    private final dev.worldcombat.core.runtime.effect.EffectRegistry effects = new dev.worldcombat.core.runtime.effect.EffectRegistry();
    private final WorldHooks hooks = new WorldHooks();
    public WorldHooks hooks() { return hooks; }
    private final Map<String, ActionDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, ActionPreview> previews = new HashMap<>();
    private final Set<String> disabled = ConcurrentHashMap.newKeySet();
    private volatile long epoch;
    private volatile boolean ready;
    private boolean loading;

    public synchronized void begin() {
        ready = false;
        loading = true;
        epoch++;
        effects.begin(epoch);
        hooks.begin(epoch);
        definitions.clear();
        previews.clear();
        disabled.clear();
        failures.clear();
    }

    public synchronized void register(long expectedEpoch, String id, String version, int maxTicks,
                                      Consumer<ActionContext> handler) {
        registerForDomain(expectedEpoch, id, version, maxTicks, "*", handler);
    }

    public synchronized void registerForDomain(long expectedEpoch, String id, String version, int maxTicks,
                                                String actorDomain, Consumer<ActionContext> handler) {
        registerAction(expectedEpoch, id, version, maxTicks, actorDomain, "enemy", 32, handler);
    }

    public synchronized void registerAction(long expectedEpoch, String id, String version, int maxTicks,
                                            String actorDomain, String targetKind, double range,
                                            Consumer<ActionContext> handler) {
        if (!loading || epoch != expectedEpoch)
            throw new IllegalStateException("Register actions during server script loading");
        var definition = new ActionDefinition(id, version, maxTicks, handler, actorDomain, targetKind, range);
        if (definitions.putIfAbsent(id, definition) != null)
            throw new IllegalArgumentException("Duplicate action: " + id);
    }

    public synchronized void complete(boolean success) {
        loading = false;
        ready = false;
        if (success) for (var definition : definitions.values())
            if (previews.getOrDefault(definition.id(), ActionPreview.EMPTY).input().sustained() && !definition.composition().owns("input"))
                throw new IllegalArgumentException("Sustained action requires an input claim: " + definition.id());
        effects.complete(success);
        hooks.complete(success);
        ready = success;
        if (!success) definitions.clear();
    }

    public synchronized ActionDefinition get(String id) {
        return ready && !disabled.contains(id) ? definitions.get(id) : null;
    }

    public synchronized Set<String> ids() { return Set.copyOf(definitions.keySet()); }
    public synchronized void composition(long expectedEpoch, String action, String json) {
        if (!loading || epoch != expectedEpoch || !definitions.containsKey(action))
            throw new IllegalStateException("Declare composition after registering the action during content loading");
        var old = definitions.get(action);
        definitions.put(action, new ActionDefinition(old.id(), old.version(), old.maxTicks(), old.start(), old.actorDomain(), old.targetKind(), old.range(), ActionComposition.parse(json)));
    }
    public synchronized void preview(long expectedEpoch, String action, String json) {
        if (!loading || epoch != expectedEpoch || !definitions.containsKey(action))
            throw new IllegalStateException("Declare previews after registering their action during content loading");
        previews.put(action, ActionPreview.parse(json));
    }
    public synchronized ActionPreview preview(String action) { return get(action) == null ? ActionPreview.EMPTY : previews.getOrDefault(action, ActionPreview.EMPTY); }
    public void disable(String id) { disabled.add(id); }
    /** Script failures tolerated per action before the definition is disabled for the session. */
    public static final int FAILURE_LIMIT = 3;
    /** Ticks after which an action's earlier failures stop counting. */
    public static final long FAILURE_WINDOW = 20L * 60 * 5;
    private final Map<String, long[]> failures = new ConcurrentHashMap<>();
    /**
     * Records one script failure of an action instance. Returns true when the action has now failed
     * {@link #FAILURE_LIMIT} times within {@link #FAILURE_WINDOW} ticks and has been disabled; a single
     * bad cast otherwise ends only that instance and the move stays usable.
     */
    public boolean failed(String id, long tick) {
        var record = failures.computeIfAbsent(id, key -> new long[] {0, tick});
        synchronized (record) {
            if (tick - record[1] > FAILURE_WINDOW) record[0] = 0;
            record[0]++; record[1] = tick;
            if (record[0] < FAILURE_LIMIT) return false;
        }
        disable(id);
        return true;
    }
    public synchronized void shutdown() { begin(); complete(false); }
    public boolean ready() { return ready; }
    public long epoch() { return epoch; }
    public dev.worldcombat.core.runtime.effect.EffectRegistry effects() { return effects; }
}
