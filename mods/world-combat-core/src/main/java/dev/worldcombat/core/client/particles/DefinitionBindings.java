package dev.worldcombat.core.client.particles;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Numeric leaves resolved from an instance payload before the ordinary definition parser runs. */
public final class DefinitionBindings {
    /**
     * A payload-driven leaf. Numeric bindings read {@code fields} as a finite number; colour palette
     * bindings read it as a string key and map it through {@code colors}.
     */
    private record Slot(List<String> location, String path, String[] fields, double fallback, Map<String, Integer> colors) {}

    private final String id;
    private final int version;
    private final JsonObject template;
    private final List<Slot> slots = new ArrayList<>();
    private final Set<String> boundPaths;

    DefinitionBindings(String id, int version, JsonObject template) {
        this.id = id;
        this.version = version;
        this.template = template.deepCopy();
        collect(this.template, List.of(), "");
        var paths = new LinkedHashSet<String>();
        for (Slot slot : slots) paths.add(slot.path());
        this.boundPaths = Set.copyOf(paths);
    }

    boolean empty() { return slots.isEmpty(); }

    /** Missing or null payload fields use the authored fallback; present values must be finite numbers. */
    public ParticleDefinition resolve(JsonObject data) {
        return DefinitionParser.parseResolved(id, version, materialize(data), true, boundPaths);
    }

    JsonObject materialize(JsonObject data) {
        JsonObject result = template.deepCopy();
        for (Slot slot : slots) {
            JsonElement leaf;
            if (slot.colors() != null) {
                String key = paletteKey(data, slot);
                Integer mapped = key == null ? null : slot.colors().get(key);
                leaf = new JsonPrimitive(mapped != null ? mapped : (int) slot.fallback());
            } else {
                JsonElement value = data;
                for (String field : slot.fields()) {
                    if (value == null || value.isJsonNull()) break;
                    if (value.isJsonObject()) value = value.getAsJsonObject().get(field);
                    else if (value.isJsonArray() && field.matches("0|[1-9][0-9]*")) {
                        long index;
                        try { index = Long.parseLong(field); }
                        catch (NumberFormatException ignored) { index = Long.MAX_VALUE; }
                        value = index < value.getAsJsonArray().size() ? value.getAsJsonArray().get((int) index) : null;
                    } else throw error(slot.path(), "payload path crosses a non-container value");
                }
                leaf = new JsonPrimitive(value == null || value.isJsonNull() ? slot.fallback() : finite(value, slot.path()));
            }
            setNode(result, slot.location(), leaf);
        }
        return result;
    }

    private void setNode(JsonElement result, List<String> location, JsonElement value) {
        JsonElement parent = result;
        for (int i = 0; i < location.size() - 1; i++) {
            String field = location.get(i);
            parent = parent.isJsonArray() ? parent.getAsJsonArray().get(Integer.parseInt(field)) : parent.getAsJsonObject().get(field);
        }
        String field = location.getLast();
        if (parent.isJsonArray()) parent.getAsJsonArray().set(Integer.parseInt(field), value);
        else parent.getAsJsonObject().add(field, value);
    }

    private void collect(JsonElement node, List<String> location, String path) {
        if (node.isJsonArray()) {
            for (int i = 0; i < node.getAsJsonArray().size(); i++)
                collect(node.getAsJsonArray().get(i), append(location, String.valueOf(i)), path + "[" + i + "]");
        } else if (node.isJsonObject()) {
            JsonObject object = node.getAsJsonObject();
            if (object.has("data")) {
                if (!object.keySet().equals(Set.of("data", "fallback")))
                    throw error(path, "numeric binding requires exactly data and fallback");
                JsonElement field = object.get("data");
                if (!field.isJsonPrimitive() || !field.getAsJsonPrimitive().isString()
                    || !field.getAsString().matches("[^.\\s]+(?:\\.[^.\\s]+)*"))
                    throw error(path + ".data", "expected a dot-separated payload field path");
                if (location.isEmpty()) throw error(path, "binding must replace a numeric leaf");
                slots.add(new Slot(List.copyOf(location), path, field.getAsString().split("\\."), finite(object.get("fallback"), path + ".fallback"), null));
            } else if (object.has("colors")) {
                if (!object.keySet().equals(Set.of("attribute", "colors", "fallback")))
                    throw error(path, "colour palette binding requires exactly attribute, colors and fallback");
                JsonElement colorsElement = object.get("colors");
                if (colorsElement == null || !colorsElement.isJsonObject())
                    throw error(path + ".colors", "expected an object of id to colour");
                Map<String, Integer> colors = new LinkedHashMap<>();
                for (var entry : colorsElement.getAsJsonObject().entrySet())
                    colors.put(entry.getKey(), paletteColor(entry.getValue(), path + ".colors." + entry.getKey()));
                if (location.isEmpty()) throw error(path, "binding must replace a numeric leaf");
                slots.add(new Slot(List.copyOf(location), path, attributePath(object.get("attribute"), path),
                    paletteColor(object.get("fallback"), path + ".fallback"), colors));
            } else {
                for (var field : object.entrySet())
                    collect(field.getValue(), append(location, field.getKey()), path.isEmpty() ? field.getKey() : path + "." + field.getKey());
            }
        }
    }

    private double finite(JsonElement value, String path) {
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber() || !Double.isFinite(value.getAsDouble()))
            throw error(path, "numeric binding requires a finite number");
        return value.getAsDouble();
    }

    private String[] attributePath(JsonElement value, String path) {
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()
            || !value.getAsString().matches("[^.\\s]+(?:\\.[^.\\s]+)*"))
            throw error(path + ".attribute", "expected a dot-separated payload field path");
        return value.getAsString().split("\\.");
    }

    /** Reads the payload string a palette binding maps; a missing or non-string field uses the fallback. */
    private String paletteKey(JsonObject data, Slot slot) {
        JsonElement value = data;
        for (String field : slot.fields()) {
            if (value == null || value.isJsonNull()) return null;
            if (value.isJsonObject()) value = value.getAsJsonObject().get(field);
            else if (value.isJsonArray() && field.matches("0|[1-9][0-9]*")) {
                long index;
                try { index = Long.parseLong(field); }
                catch (NumberFormatException ignored) { return null; }
                value = index < value.getAsJsonArray().size() ? value.getAsJsonArray().get((int) index) : null;
            } else return null;
        }
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) return null;
        return value.getAsString();
    }

    private int paletteColor(JsonElement value, String path) {
        if (value == null || !value.isJsonPrimitive())
            throw error(path, "expected a colour number or \"#RRGGBB\"");
        JsonPrimitive primitive = value.getAsJsonPrimitive();
        if (primitive.isNumber()) {
            double number = primitive.getAsDouble();
            if (!Double.isFinite(number) || number != Math.rint(number) || number < 0 || number > 0xFFFFFF)
                throw error(path, "colour must be an integer within 0x000000..0xFFFFFF, got " + primitive.getAsString());
            return (int) number;
        }
        if (primitive.isString()) {
            String text = primitive.getAsString().trim();
            if (text.startsWith("#")) text = text.substring(1);
            if (text.length() != 6) throw error(path, "expected 6 hex digits, got '" + primitive.getAsString() + "'");
            try { return Integer.parseInt(text, 16) & 0xFFFFFF; }
            catch (NumberFormatException failure) { throw error(path, "expected 6 hex digits, got '" + primitive.getAsString() + "'"); }
        }
        throw error(path, "expected a colour number or \"#RRGGBB\"");
    }

    private IllegalArgumentException error(String path, String message) {
        return new IllegalArgumentException(id + "@" + version + " " + path + ": " + message);
    }

    private static List<String> append(List<String> path, String field) {
        var result = new ArrayList<>(path);
        result.add(field);
        return result;
    }
}
