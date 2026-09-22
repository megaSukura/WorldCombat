package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import dev.worldcombat.core.client.ClientPresentation;
import java.lang.reflect.Array;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

/**
 * Client script binding exposed as {@code WorldCombatParticles}. Unit {@code presentation.ts} files
 * register definitions here; the engine keeps all runtime state in Java and never calls back into
 * the script per particle. Owned by wave 4.
 */
public final class ParticleScriptApi {
    private static final Pattern ID_PATTERN = Pattern.compile("[a-z0-9_.-]+:[a-z0-9_./-]+");
    private static final AtomicInteger LOCAL_SEQUENCE = new AtomicInteger();

    /**
     * Registers an authored definition for a unit id/version. Rhino objects and arrays (which expose
     * {@link Map}/{@link List}) are converted to a Gson tree; a JSON string and a {@link JsonElement}
     * are accepted for Java callers and for {@code JSON.stringify(definition)}.
     *
     * @param id         unit id, for example {@code world_combat:thunderbolt}
     * @param version    definition version, at least 1
     * @param definition a Rhino object array, a JSON string, or a {@link JsonElement} from Java
     */
    public void scene(String id, int version, Object definition) {
        checkId(id, version);
        JsonElement json;
        if (definition instanceof JsonElement element) {
            json = element;
        } else if (definition instanceof String text) {
            try {
                json = JsonParser.parseString(text);
            } catch (RuntimeException failure) {
                throw new IllegalArgumentException("definition for " + id + "@" + version + " is not valid JSON: " + failure.getMessage(), failure);
            }
        } else {
            json = toJson(definition, id + "@" + version + " definition");
        }
        if (json == null || !json.isJsonObject())
            throw new IllegalArgumentException(id + "@" + version + ": definition must be a JSON object");
        ParticleDirector.INSTANCE.register(id, version, json);
    }

    /**
     * Plays a definition locally on the client, without a server entry. Intended for commands and
     * previews.
     *
     * @param id       unit id
     * @param version  definition version
     * @param x        world x, blocks
     * @param y        world y, blocks
     * @param z        world z, blocks
     * @param dataJson server-side {@code data} object as JSON
     * @param ticks    lifetime in ticks; at most 0 lasts until the next content reset
     */
    public void local(String id, int version, double x, double y, double z, String dataJson, int ticks) {
        checkId(id, version);
        JsonObject entry = localEntry(id, version, x, y, z, dataJson, LOCAL_SEQUENCE.getAndIncrement());
        ClientPresentation.addLocal(entry, ticks);
    }

    /**
     * Builds one client-only scene entry. {@code source} is taken from {@code data.source} when that
     * field is a string, otherwise it stays empty.
     *
     * @param ordinal the local sequence number placed into {@code key}
     * @throws IllegalArgumentException when the position is not finite or {@code dataJson} is not a JSON object
     */
    static JsonObject localEntry(String id, int version, double x, double y, double z, String dataJson, int ordinal) {
        if (!Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(z))
            throw new IllegalArgumentException("local(\"" + id + "\") position must be finite, got [" + x + ", " + y + ", " + z + "]");
        JsonElement data;
        if (dataJson == null || dataJson.isBlank()) {
            data = new JsonObject();
        } else {
            try {
                data = JsonParser.parseString(dataJson);
            } catch (RuntimeException failure) {
                throw new IllegalArgumentException("local(\"" + id + "\") dataJson is not valid JSON: " + failure.getMessage(), failure);
            }
        }
        if (!data.isJsonObject())
            throw new IllegalArgumentException("local(\"" + id + "\") dataJson must be a JSON object, got " + data);
        JsonObject dataObject = data.getAsJsonObject();
        String source = "";
        JsonElement sourceElement = dataObject.get("source");
        if (sourceElement != null && !sourceElement.isJsonNull()) {
            if (!sourceElement.isJsonPrimitive() || !sourceElement.getAsJsonPrimitive().isString())
                throw new IllegalArgumentException("local(\"" + id + "\") data.source must be a string");
            source = sourceElement.getAsString();
        }
        JsonObject entry = new JsonObject();
        entry.addProperty("key", "local/" + id + "/" + ordinal);
        entry.addProperty("owner", 0);
        entry.addProperty("source", source);
        entry.addProperty("type", id);
        entry.addProperty("version", version);
        JsonArray position = new JsonArray();
        position.add(x);
        position.add(y);
        position.add(z);
        entry.add("position", position);
        entry.add("data", dataObject);
        return entry;
    }

    /**
     * Recursively converts a Rhino value (or any Java value) to a Gson tree. Rhino {@code NativeObject}
     * implements {@link Map} and {@code NativeArray} implements {@link List}, so plain object literals
     * and arrays are handled without a script dependency.
     *
     * @throws IllegalArgumentException for non-finite numbers and unsupported value types
     */
    static JsonElement toJson(Object value, String path) {
        if (value == null) return JsonNull.INSTANCE;
        if (value instanceof JsonElement element) return element.deepCopy();
        if (value instanceof String text) return new JsonPrimitive(text);
        if (value instanceof Boolean bool) return new JsonPrimitive(bool);
        if (value instanceof Character character) return new JsonPrimitive(character);
        if (value instanceof Number number) {
            if (!Double.isFinite(number.doubleValue()))
                throw new IllegalArgumentException(path + ": number must be finite, got " + number);
            return new JsonPrimitive(number);
        }
        if (value instanceof Map<?, ?> map) {
            JsonObject object = new JsonObject();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() == null) continue;
                String key = String.valueOf(entry.getKey());
                object.add(key, toJson(entry.getValue(), path + "." + key));
            }
            return object;
        }
        if (value instanceof List<?> list) {
            JsonArray array = new JsonArray();
            for (int i = 0; i < list.size(); i++) array.add(toJson(list.get(i), path + "[" + i + "]"));
            return array;
        }
        if (value.getClass().isArray()) {
            JsonArray array = new JsonArray();
            int length = Array.getLength(value);
            for (int i = 0; i < length; i++) array.add(toJson(Array.get(value, i), path + "[" + i + "]"));
            return array;
        }
        throw new IllegalArgumentException(path + ": unsupported value type " + value.getClass().getName());
    }

    private static void checkId(String id, int version) {
        if (id == null || !ID_PATTERN.matcher(id).matches())
            throw new IllegalArgumentException(
                "Particle definition id must be namespace:path matching [a-z0-9_.-]+:[a-z0-9_./-]+, got '" + id + "'");
        if (version < 1)
            throw new IllegalArgumentException("Particle definition version must be at least 1, got " + version);
    }
}
