package dev.worldcombat.core.runtime.effect;

import com.google.gson.*;

/** Copies JSON values across the script boundary; never retains engine objects. */
public final class EffectData {
    public static final Gson GSON = new GsonBuilder().serializeNulls().create();
    public record Limits(int characters, int depth, int nodes, int stringLength) {
        public Limits {
            if (characters < 1 || depth < 1 || nodes < 1 || stringLength < 1) throw new IllegalArgumentException("Invalid JSON limits");
        }
    }
    private EffectData() {}
    public static String copy(String json) {
        return copy(json, null);
    }
    /** Callers can use the same strict parser with the budget of their own transport or storage. */
    public static String copy(String json, Limits limits) {
        if (json == null) throw new IllegalArgumentException("JSON is required");
        if (limits != null && json.length() > limits.characters()) throw new IllegalArgumentException("JSON exceeds transport allowance");
        JsonElement value;
        try (var reader = new com.google.gson.stream.JsonReader(new java.io.StringReader(json))) {
            reader.setLenient(false);
            value = GSON.getAdapter(JsonElement.class).read(reader);
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) throw new IllegalArgumentException("Trailing effect data");
        } catch (java.io.IOException error) { throw new IllegalArgumentException("Invalid effect JSON", error); }
        if (value == null || !value.isJsonObject()) throw new IllegalArgumentException("Effect data must be an object");
        inspect(value, 0, new int[]{0}, limits);
        return GSON.toJson(value);
    }
    private static void inspect(JsonElement value, int depth, int[] nodes, Limits limits) {
        if (limits != null && (depth > limits.depth() || ++nodes[0] > limits.nodes())) throw new IllegalArgumentException("JSON exceeds transport structure allowance");
        if (value.isJsonObject()) {
            for (var entry : value.getAsJsonObject().entrySet()) {
                inspect(entry.getValue(), depth + 1, nodes, limits);
            }
        } else if (value.isJsonArray()) {
            for (var element : value.getAsJsonArray()) inspect(element, depth + 1, nodes, limits);
        } else if (value.isJsonPrimitive()) {
            var primitive = value.getAsJsonPrimitive();
            if (primitive.isNumber() && !Double.isFinite(primitive.getAsDouble()))
                throw new IllegalArgumentException("Effect numbers must be finite");
            if (limits != null && primitive.isString() && primitive.getAsString().length() > limits.stringLength())
                throw new IllegalArgumentException("Effect string too long");
        }
    }
    public static String id(String id) {
        if (id == null || !id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+") || id.length() > 128)
            throw new IllegalArgumentException("Expected a namespaced content id: " + id);
        return id;
    }
    public static String key(String key) {
        if (key == null || !key.matches("[a-zA-Z0-9_:./-]{1,128}"))
            throw new IllegalArgumentException("Invalid key (letters, digits, _ : . / - up to 128 characters): " + key);
        return key;
    }
}
