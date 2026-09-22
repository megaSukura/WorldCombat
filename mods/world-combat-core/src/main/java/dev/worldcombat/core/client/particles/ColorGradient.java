package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

/**
 * An authored colour ramp over normalized particle life. Produces packed ARGB with an optional
 * {@code tint} multiplied channel-wise. Pure logic; no Minecraft dependency.
 */
public final class ColorGradient {
    private final double[] stops;
    private final int[] colors;
    private final int tint;

    private ColorGradient(double[] stops, int[] colors, int tint) {
        if (stops.length == 0 || stops.length != colors.length) throw new IllegalArgumentException("Colour ramp needs matching stops and colours");
        this.stops = stops;
        this.colors = colors;
        this.tint = tint;
    }

    /** A constant 0xRRGGBB colour. */
    public static ColorGradient of(int rgb) {
        return new ColorGradient(new double[] {0}, new int[] {rgb & 0xFFFFFF}, -1);
    }

    /** A colour ramp; {@code stops} ascend in 0..1, {@code colors} are 0xRRGGBB, {@code tint} is -1 for none. */
    public static ColorGradient of(double[] stops, int[] colors, int tint) {
        if (stops == null || colors == null || stops.length != colors.length) throw new IllegalArgumentException("Colour ramp needs matching stops and colours");
        var stopsCopy = stops.clone();
        for (int i = 0; i < stopsCopy.length; i++) {
            if (i > 0 && stopsCopy[i] < stopsCopy[i - 1]) throw new IllegalArgumentException("Colour stops must ascend in life");
        }
        var colorsCopy = new int[colors.length];
        for (int i = 0; i < colors.length; i++) colorsCopy[i] = colors[i] & 0xFFFFFF;
        return new ColorGradient(stopsCopy, colorsCopy, tint < 0 ? -1 : tint & 0xFFFFFF);
    }

    /**
     * Parses an authored colour: a number or {@code "#RRGGBB"}/{@code "RRGGBB"} string for a
     * constant, or {@code {gradient: [[t, colour], ...]}} for a ramp. {@code t} ascends within 0..1.
     *
     * @param element the colour node; must not be null
     * @param path    JSON path used in error messages
     */
    public static ColorGradient read(JsonElement element, String path) {
        if (element == null || element.isJsonNull()) throw expected(path);
        if (element.isJsonPrimitive()) return of(readColor(element, path));
        if (element.isJsonObject()) {
            JsonObject object = element.getAsJsonObject();
            for (String key : object.keySet()) {
                if (!key.equals("gradient")) throw new IllegalArgumentException(path + ": unexpected key '" + key + "'");
            }
            if (!object.has("gradient")) throw expected(path);
            JsonElement ramp = object.get("gradient");
            if (ramp == null || !ramp.isJsonArray()) throw new IllegalArgumentException(path + ".gradient: expected [[t, colour], ...]");
            JsonArray array = ramp.getAsJsonArray();
            if (array.size() == 0) throw new IllegalArgumentException(path + ".gradient: requires at least one stop");
            var stops = new double[array.size()];
            var colors = new int[array.size()];
            for (int i = 0; i < array.size(); i++) {
                JsonElement stop = array.get(i);
                if (stop == null || !stop.isJsonArray() || stop.getAsJsonArray().size() != 2) throw new IllegalArgumentException(path + ".gradient[" + i + "]: expected [t, colour]");
                JsonArray pair = stop.getAsJsonArray();
                if (pair.get(0) == null || !pair.get(0).isJsonPrimitive() || !pair.get(0).getAsJsonPrimitive().isNumber()) throw new IllegalArgumentException(path + ".gradient[" + i + "]: t must be a number");
                double t = pair.get(0).getAsDouble();
                if (!(t >= 0 && t <= 1)) throw new IllegalArgumentException(path + ".gradient[" + i + "]: t must be within 0..1, got " + t);
                if (i > 0 && t < stops[i - 1]) throw new IllegalArgumentException(path + ".gradient[" + i + "]: t must not descend, got " + t + " after " + stops[i - 1]);
                stops[i] = t;
                colors[i] = readColor(pair.get(1), path + ".gradient[" + i + "]");
            }
            return of(stops, colors, -1);
        }
        throw expected(path);
    }

    private static int readColor(JsonElement element, String path) {
        if (element == null || !element.isJsonPrimitive()) throw new IllegalArgumentException(path + ": expected colour number or \"#RRGGBB\"");
        JsonPrimitive primitive = element.getAsJsonPrimitive();
        if (primitive.isNumber()) {
            double value = primitive.getAsDouble();
            if (!Double.isFinite(value) || value != Math.rint(value) || value < 0 || value > 0xFFFFFF)
                throw new IllegalArgumentException(path + ": colour must be an integer within 0x000000..0xFFFFFF, got " + primitive.getAsString());
            return (int) value;
        }
        if (primitive.isString()) {
            String text = primitive.getAsString().trim();
            if (text.startsWith("#")) text = text.substring(1);
            if (text.length() != 6) throw new IllegalArgumentException(path + ": expected 6 hex digits, got '" + primitive.getAsString() + "'");
            try {
                return Integer.parseInt(text, 16) & 0xFFFFFF;
            } catch (NumberFormatException error) {
                throw new IllegalArgumentException(path + ": expected 6 hex digits, got '" + primitive.getAsString() + "'", error);
            }
        }
        throw new IllegalArgumentException(path + ": expected colour number or \"#RRGGBB\"");
    }

    private static IllegalArgumentException expected(String path) {
        return new IllegalArgumentException(path + ": expected colour number, \"#RRGGBB\" or {gradient}");
    }

    /** Returns a copy with the given 0xRRGGBB tint, or the original when {@code tint < 0}. */
    public ColorGradient withTint(int tint) {
        return tint < 0 ? this : new ColorGradient(stops, colors, tint & 0xFFFFFF);
    }

    /** The 0xRRGGBB tint, or -1 when untinted. */
    public int tint() { return tint; }

    /** Samples 0xRRGGBB at normalized life with the tint applied. */
    public int rgb(double life) {
        double t = life < 0 ? 0 : life > 1 ? 1 : life;
        int last = stops.length - 1;
        int base;
        if (last == 0 || t <= stops[0]) base = colors[0];
        else if (t >= stops[last]) base = colors[last];
        else {
            int index = 1;
            while (index < last && t > stops[index]) index++;
            double span = stops[index] - stops[index - 1];
            double mix = span <= 0 ? 1 : (t - stops[index - 1]) / span;
            base = mixRgb(colors[index - 1], colors[index], mix);
        }
        return tint < 0 ? base : mulRgb(base, tint);
    }

    /** Samples packed opaque ARGB (0xFF000000 | rgb) at normalized life. */
    public int argb(double life) { return 0xFF000000 | rgb(life); }

    private static int mixRgb(int a, int b, double mix) {
        double m = mix < 0 ? 0 : mix > 1 ? 1 : mix;
        int r = (int) Math.round(((a >> 16) & 0xFF) + (((b >> 16) & 0xFF) - ((a >> 16) & 0xFF)) * m);
        int g = (int) Math.round(((a >> 8) & 0xFF) + (((b >> 8) & 0xFF) - ((a >> 8) & 0xFF)) * m);
        int bl = (int) Math.round((a & 0xFF) + ((b & 0xFF) - (a & 0xFF)) * m);
        return (r << 16) | (g << 8) | bl;
    }

    private static int mulRgb(int rgb, int tint) {
        int r = ((rgb >> 16) & 0xFF) * ((tint >> 16) & 0xFF) / 255;
        int g = ((rgb >> 8) & 0xFF) * ((tint >> 8) & 0xFF) / 255;
        int b = (rgb & 0xFF) * (tint & 0xFF) / 255;
        return (r << 16) | (g << 8) | b;
    }
}
