package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure-logic checks for the local-preview script API: the client-only scene entry shape, the source
 * fallback, the Rhino-to-Gson conversion, and the bare curve regression. Owned by the api-v2 module.
 */
public final class LocalEntryChecks {
    private LocalEntryChecks() {}

    public static void main(String[] args) {
        localEntryFields();
        sourceFallback();
        ordinalKey();
        rhinoConversion();
        bareCurve();
        invalidInput();
        System.out.println("LocalEntryChecks PASS");
    }

    private static void localEntryFields() {
        JsonObject entry = ParticleScriptApi.localEntry(
            "world_combat:thunderbolt", 1, 1.5, 2.5, 3.5, "{\"moment\":\"impact\"}", 7);
        same(entry.get("key").getAsString(), "local/world_combat:thunderbolt/7", "key");
        num(entry.get("owner").getAsLong(), 0, "owner");
        same(entry.get("source").getAsString(), "", "source fallback");
        same(entry.get("type").getAsString(), "world_combat:thunderbolt", "type");
        num(entry.get("version").getAsInt(), 1, "version");

        JsonArray position = entry.getAsJsonArray("position");
        is(position != null, "position present");
        num(position.size(), 3, "position size");
        num(position.get(0).getAsDouble(), 1.5, "position x");
        num(position.get(1).getAsDouble(), 2.5, "position y");
        num(position.get(2).getAsDouble(), 3.5, "position z");

        JsonObject data = entry.getAsJsonObject("data");
        is(data != null, "data present");
        same(data.get("moment").getAsString(), "impact", "data.moment");

        JsonObject empty = ParticleScriptApi.localEntry("world_combat:test", 2, 0, 0, 0, "", 0);
        is(empty.getAsJsonObject("data").isEmpty(), "blank dataJson becomes an empty object");
        same(empty.get("source").getAsString(), "", "blank data has no source");
    }

    private static void sourceFallback() {
        JsonObject withSource = ParticleScriptApi.localEntry(
            "world_combat:test", 1, 0, 0, 0, "{\"moment\":\"main\",\"source\":\"abc-123\"}", 0);
        same(withSource.get("source").getAsString(), "abc-123", "data.source is promoted to entry source");
        same(withSource.getAsJsonObject("data").get("source").getAsString(), "abc-123", "data.source is kept");

        JsonObject withoutSource = ParticleScriptApi.localEntry(
            "world_combat:test", 1, 0, 0, 0, "{\"moment\":\"main\"}", 0);
        same(withoutSource.get("source").getAsString(), "", "missing data.source leaves an empty source");
    }

    private static void ordinalKey() {
        JsonObject first = ParticleScriptApi.localEntry("world_combat:test", 1, 0, 0, 0, "{}", 0);
        JsonObject second = ParticleScriptApi.localEntry("world_combat:test", 1, 0, 0, 0, "{}", 1);
        is(!first.get("key").getAsString().equals(second.get("key").getAsString()), "ordinal changes the key");
        same(first.get("key").getAsString(), "local/world_combat:test/0", "first ordinal key");
        same(second.get("key").getAsString(), "local/world_combat:test/1", "second ordinal key");
    }

    private static void rhinoConversion() {
        var emitter = new LinkedHashMap<String, Object>();
        emitter.put("name", "a");
        emitter.put("particle", "ns:path");
        emitter.put("lifetime", 10);
        emitter.put("size", 1.0);
        emitter.put("rate", 1);
        emitter.put("alwaysRender", false);
        emitter.put("color", 0x66CCFF);
        emitter.put("note", null);
        var offset = new ArrayList<Object>();
        offset.add(0.0);
        offset.add(1.0);
        offset.add(0.0);
        emitter.put("offset", offset);
        var emitters = new ArrayList<Object>();
        emitters.add(emitter);
        var main = new LinkedHashMap<String, Object>();
        main.put("emitters", emitters);
        var moments = new LinkedHashMap<String, Object>();
        moments.put("main", main);
        var root = new LinkedHashMap<String, Object>();
        root.put("moments", moments);

        JsonElement converted = ParticleScriptApi.toJson(root, "definition");
        is(converted.isJsonObject(), "converted root is an object");
        JsonObject out = converted.getAsJsonObject();
        JsonObject outEmitter = out.getAsJsonObject("moments").getAsJsonObject("main")
            .getAsJsonArray("emitters").get(0).getAsJsonObject();
        same(outEmitter.get("name").getAsString(), "a", "converted string");
        num(outEmitter.get("lifetime").getAsInt(), 10, "converted integer");
        num(outEmitter.get("size").getAsDouble(), 1.0, "converted double");
        is(!outEmitter.get("alwaysRender").getAsBoolean(), "converted boolean");
        is(outEmitter.get("note").isJsonNull(), "converted null");
        num(outEmitter.get("color").getAsInt(), 0x66CCFF, "converted colour");
        JsonArray outOffset = outEmitter.getAsJsonArray("offset");
        num(outOffset.size(), 3, "converted array size");
        num(outOffset.get(1).getAsDouble(), 1.0, "converted array element");

        JsonObject javaElement = new JsonObject();
        javaElement.addProperty("moment", "main");
        is(ParticleScriptApi.toJson(javaElement, "definition").getAsJsonObject().has("moment"),
            "JsonElement input is preserved");
        same(ParticleScriptApi.toJson("text", "value").getAsString(), "text", "top-level string conversion");
        is(ParticleScriptApi.toJson(null, "value").isJsonNull(), "null conversion");
    }

    private static void bareCurve() {
        Value curve = Values.read(JsonParser.parseString("[[0,0],[1,10]]"), "size");
        num(curve.sample(0.5, 0), 5, "bare curve midpoint");
        num(curve.sample(0.5, 0.9), 5, "bare curve ignores random");
        num(curve.sample(0, 1), 0, "bare curve start");
        num(curve.sample(1, 0), 10, "bare curve end");
    }

    private static void invalidInput() {
        expectIae(() -> ParticleScriptApi.localEntry("world_combat:test", 1, 0, 0, 0, "not json", 0), "dataJson");
        expectIae(() -> ParticleScriptApi.localEntry("world_combat:test", 1, 0, 0, 0, "[1,2]", 0), "dataJson");
        expectIae(() -> ParticleScriptApi.localEntry("world_combat:test", 1, 0, 0, 0, "{\"source\":5}", 0), "source");
        expectIae(() -> ParticleScriptApi.localEntry("world_combat:test", 1, Double.NaN, 0, 0, "{}", 0), "position");

        var bad = new LinkedHashMap<String, Object>();
        bad.put("x", Double.NaN);
        expectIae(() -> ParticleScriptApi.toJson(bad, "definition"), "finite");
        expectIae(() -> ParticleScriptApi.toJson(new Object(), "definition"), "unsupported");

        var api = new ParticleScriptApi();
        expectIae(() -> api.scene("NoNamespace", 1, "{\"moments\":{}}"), "id");
        expectIae(() -> api.scene("world_combat:test", 0, "{\"moments\":{}}"), "version");
        expectIae(() -> api.local("Bad", 1, 0, 0, 0, "{}", 1), "id");
    }

    private static void expectIae(Runnable action, String context) {
        try {
            action.run();
        } catch (IllegalArgumentException failure) {
            String message = failure.getMessage();
            if (message == null || !message.toLowerCase().contains(context.toLowerCase()))
                throw new AssertionError("expected '" + context + "' in message, got: " + message);
            return;
        }
        throw new AssertionError("expected IllegalArgumentException mentioning '" + context + "'");
    }

    private static void num(double actual, double expected, String label) {
        if (Math.abs(actual - expected) > 1e-9) throw new AssertionError(label + ": expected " + expected + " got " + actual);
    }

    private static void same(Object actual, Object expected, String label) {
        if (!java.util.Objects.equals(actual, expected)) throw new AssertionError(label + ": expected " + expected + " got " + actual);
    }

    private static void is(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
