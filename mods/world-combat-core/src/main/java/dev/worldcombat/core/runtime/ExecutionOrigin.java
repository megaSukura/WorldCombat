package dev.worldcombat.core.runtime;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.effect.EffectData;
import java.util.HashMap;
import java.util.Map;

/** Host-issued transient provenance and shared state for one execution and its derived effects. */
public final class ExecutionOrigin {
    private final String instance;
    private final ActorHandle source;
    private final long action;
    private final Map<String, String> data = new HashMap<>();
    public ExecutionOrigin(String instance, ActorHandle source, long action) {
        this.instance = instance; this.source = source; this.action = action;
    }
    public String instance() { return instance; }
    public boolean belongsTo(ActorHandle actor) { return source.equals(actor); }
    public String data(String key) { return data.get(EffectData.id(key)); }
    public void data(String key, String value) {
        EffectData.id(key);
        if (value == null) throw new IllegalArgumentException("Execution JSON is required");
        com.google.gson.JsonElement parsed;
        try (var reader = new com.google.gson.stream.JsonReader(new java.io.StringReader(value))) {
            reader.setLenient(false);
            parsed = EffectData.GSON.getAdapter(com.google.gson.JsonElement.class).read(reader);
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) throw new IllegalArgumentException("Trailing execution JSON");
        } catch (java.io.IOException error) { throw new IllegalArgumentException("Invalid execution JSON", error); }
        if (parsed == null) throw new IllegalArgumentException("Execution JSON is required");
        inspect(parsed);
        data.put(key, EffectData.GSON.toJson(parsed));
    }
    private static void inspect(com.google.gson.JsonElement root) {
        var pending = new java.util.ArrayDeque<com.google.gson.JsonElement>(); pending.push(root);
        while (!pending.isEmpty()) {
            var value = pending.pop();
            if (value.isJsonObject()) for (var entry : value.getAsJsonObject().entrySet()) pending.push(entry.getValue());
            else if (value.isJsonArray()) for (var item : value.getAsJsonArray()) pending.push(item);
            else if (value.isJsonPrimitive() && value.getAsJsonPrimitive().isNumber() && !Double.isFinite(value.getAsDouble()))
                throw new IllegalArgumentException("Execution numbers must be finite");
        }
    }
    public static String stamp(String json, ExecutionOrigin origin) {
        var data = JsonParser.parseString(EffectData.copy(json)).getAsJsonObject();
        stamp(data, origin); return data.toString();
    }
    /** Content cannot supply attribution through its mutable damage envelope. */
    public static void stamp(JsonObject data, ExecutionOrigin origin) {
        data.addProperty("originInstance", origin == null ? "" : origin.instance);
        data.addProperty("action", origin == null ? 0 : origin.action);
    }
}
