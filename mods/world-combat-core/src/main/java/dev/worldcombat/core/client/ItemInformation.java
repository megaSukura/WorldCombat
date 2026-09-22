package dev.worldcombat.core.client;

import java.util.*;

/** Script-authored descriptions of real items; optional viewers subscribe without becoming core dependencies. */
public final class ItemInformation {
    public record Entry(String item, List<String> keys) { public Entry { keys = List.copyOf(keys); } }
    private static final Map<String, LinkedHashSet<String>> entries = new LinkedHashMap<>();
    private static final Map<String, Runnable> viewers = new LinkedHashMap<>();
    private static boolean loading;
    private ItemInformation() {}

    public static void register(String item, String[] textKeys) {
        if (item == null || item.isBlank() || textKeys == null) throw new IllegalArgumentException("Item information needs an item and text keys");
        var keys = new LinkedHashSet<String>();
        for (var key : textKeys) {
            if (key == null || key.isBlank()) throw new IllegalArgumentException("Item information text keys must be nonempty");
            keys.add(key);
        }
        if (keys.isEmpty()) return;
        boolean added = entries.computeIfAbsent(item, ignored -> new LinkedHashSet<>()).addAll(keys);
        if (added && !loading) refresh();
    }
    public static List<Entry> entries() {
        return entries.entrySet().stream().map(entry -> new Entry(entry.getKey(), List.copyOf(entry.getValue()))).toList();
    }
    public static void subscribe(String id, Runnable listener) { if (listener == null) viewers.remove(id); else viewers.put(id, listener); }
    public static void beginReload() { loading = true; entries.clear(); }
    public static void completeReload(boolean valid) {
        if (!valid) entries.clear();
        loading = false; refresh();
    }
    /** Language/resource changes can invalidate the viewer's rendered descriptions without changing authored keys. */
    public static void refresh() { if (!loading) for (var listener : List.copyOf(viewers.values())) listener.run(); }
}
