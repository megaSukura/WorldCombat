package dev.worldcombat.core.runtime;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wall time spent inside script callbacks, keyed by what the host called (hook id, `effect/handler`, action step).
 * Rhino runs interpreted, so a JVM sampler only sees `interpretLoop`; this ledger is how a tick's script cost gets a name.
 */
public final class ScriptProfile {
    public record Entry(String key, long calls, long nanos) {}
    private static final Map<String, long[]> totals = new HashMap<>();
    private static long since = System.nanoTime();
    private ScriptProfile() {}
    public static long start() { return System.nanoTime(); }
    public static void end(String key, long started) {
        var slot = totals.computeIfAbsent(key, k -> new long[2]);
        slot[0]++; slot[1] += System.nanoTime() - started;
    }
    /** Entries sorted by time, heaviest first; `reset` starts a fresh window. */
    public static List<Entry> report(boolean reset) {
        var out = new ArrayList<Entry>();
        for (var e : totals.entrySet()) out.add(new Entry(e.getKey(), e.getValue()[0], e.getValue()[1]));
        out.sort((a, b) -> Long.compare(b.nanos(), a.nanos()));
        if (reset) { totals.clear(); since = System.nanoTime(); }
        return out;
    }
    public static long windowNanos() { return System.nanoTime() - since; }
}
