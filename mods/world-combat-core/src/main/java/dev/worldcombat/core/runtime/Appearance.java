package dev.worldcombat.core.runtime;

import com.google.gson.*;
import net.minecraft.resources.ResourceLocation;

/** The visual subset of helper/projectile data, copied into entity data so the client can render it. */
public final class Appearance {
    public static final Appearance EMPTY = new Appearance("", "", "", 1f, -1, false, 0f, "");
    private final String item, sprite, block, json;
    private final float spin;
    private final float scale;
    private final int tint;
    private final boolean glow;

    private Appearance(String item, String sprite, String block, float scale, int tint, boolean glow, float spin, String json) {
        this.item = item; this.sprite = sprite; this.block = block; this.scale = scale; this.tint = tint; this.glow = glow; this.spin = spin; this.json = json;
    }
    public String item() { return item; }
    public String sprite() { return sprite; }
    /** A block id rendered as a full block model, e.g. a boulder, a crystal or an ice slab body. */
    public String block() { return block; }
    /** Item/block yaw or billboard roll, in degrees per game tick; the legacy true value means four. */
    public boolean spin() { return spin != 0; }
    public float spinRate() { return spin; }
    public float spinAngle(long tick, float partial, int seed) {
        return (float) (((tick + (double) seed) * spin + partial * spin) % 360);
    }
    public float scale() { return scale; }
    /** Negative when no tint is declared. */
    public int tint() { return tint; }
    public boolean glow() { return glow; }
    /** Normalized JSON stored in entity data; empty when nothing is declared. */
    public String json() { return json; }
    public boolean empty() { return item.isEmpty() && sprite.isEmpty() && block.isEmpty(); }

    /** Reads "item", "sprite", "block", "scale", "tint", "glow" and "spin"; unrecognized or malformed values are ignored. */
    public static Appearance of(String data) {
        if (data == null || data.isBlank()) return EMPTY;
        JsonObject root;
        try {
            var value = JsonParser.parseString(data);
            if (!value.isJsonObject()) return EMPTY;
            root = value.getAsJsonObject();
        } catch (RuntimeException failure) { return EMPTY; }
        var item = id(root.get("item"));
        var sprite = id(root.get("sprite"));
        var block = id(root.get("block"));
        if (item.isEmpty() && sprite.isEmpty() && block.isEmpty()) return EMPTY;
        float scale = 1f;
        if (root.has("scale") && root.get("scale").isJsonPrimitive() && root.get("scale").getAsJsonPrimitive().isNumber()) {
            float value = root.get("scale").getAsFloat();
            if (Float.isFinite(value) && value > 0f) scale = Math.min(value, 16f);
        }
        int tint = tint(root.get("tint"));
        boolean glow = root.has("glow") && root.get("glow").isJsonPrimitive() && root.get("glow").getAsJsonPrimitive().isBoolean()
            && root.get("glow").getAsBoolean();
        float spin = 0;
        if (root.has("spin") && root.get("spin").isJsonPrimitive()) {
            var value = root.getAsJsonPrimitive("spin");
            if (value.isBoolean()) spin = value.getAsBoolean() ? 4 : 0;
            else if (value.isNumber() && Float.isFinite(value.getAsFloat())) spin = value.getAsFloat();
        }
        var normalized = new JsonObject();
        if (!item.isEmpty()) normalized.addProperty("item", item);
        if (!sprite.isEmpty()) normalized.addProperty("sprite", sprite);
        if (!block.isEmpty()) normalized.addProperty("block", block);
        if (spin != 0) normalized.addProperty("spin", spin);
        if (scale != 1f) normalized.addProperty("scale", scale);
        if (tint >= 0) normalized.addProperty("tint", tint);
        if (glow) normalized.addProperty("glow", true);
        return new Appearance(item, sprite, block, scale, tint, glow, spin, normalized.toString());
    }
    private static String id(JsonElement value) {
        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) return "";
        var id = value.getAsString();
        return ResourceLocation.tryParse(id) == null ? "" : id;
    }
    private static int tint(JsonElement value) {
        try {
            if (value != null && value.isJsonPrimitive()) {
                var primitive = value.getAsJsonPrimitive();
                if (primitive.isNumber()) return primitive.getAsInt() & 0xFFFFFF;
                if (primitive.isString()) {
                    var text = primitive.getAsString().replace("#", "").replace("0x", "");
                    return Integer.parseInt(text, 16) & 0xFFFFFF;
                }
            }
        } catch (RuntimeException ignored) {}
        return -1;
    }
}
