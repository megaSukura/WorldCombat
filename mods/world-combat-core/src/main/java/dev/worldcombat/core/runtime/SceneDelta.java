package dev.worldcombat.core.runtime;

import com.google.gson.*;
import java.util.*;

/** Content-independent scene replication. Baselines and changes carry every entry, independent of wire chunk size. */
public final class SceneDelta {
    private SceneDelta() {}
    public static JsonObject difference(Map<String, JsonObject> before, Map<String, JsonObject> after, boolean reset) {
        var delta = new JsonObject(); delta.addProperty("reset", reset);
        var upsert = new JsonArray(); var remove = new JsonArray();
        after.forEach((key, value) -> { if (reset || !value.equals(before.get(key))) upsert.add(value); });
        if (!reset) before.keySet().forEach(key -> { if (!after.containsKey(key)) remove.add(key); });
        delta.add("upsert", upsert); delta.add("remove", remove);
        return delta;
    }
    public static boolean changed(JsonObject delta) {
        return delta.get("reset").getAsBoolean() || !delta.getAsJsonArray("upsert").isEmpty() || !delta.getAsJsonArray("remove").isEmpty();
    }
    public static final class Inbox {
        private final Map<String, JsonObject> entries = new LinkedHashMap<>();
        private long revision = -1;
        private String snapshot = "[]";
        public void clear() { entries.clear(); revision = -1; snapshot = "[]"; }
        public String snapshot() { return snapshot; }
        public boolean receive(long revision, String data) {
            if (revision <= this.revision) return false;
            var delta = JsonParser.parseString(data).getAsJsonObject();
            if (delta.get("reset").getAsBoolean()) entries.clear();
            for (var key : delta.getAsJsonArray("remove")) entries.remove(key.getAsString());
            for (var value : delta.getAsJsonArray("upsert")) {
                var entry = value.getAsJsonObject(); entries.put(entry.get("key").getAsString(), entry);
            }
            var array = new JsonArray(); entries.values().forEach(array::add); snapshot = array.toString();
            this.revision = revision; return true;
        }
    }
}
