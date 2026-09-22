package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

/** Factories and parser entry points for {@link Value}. Pure logic; no Minecraft dependency. */
public final class Values {
    private Values() {}

    /** A value that ignores life and random. */
    public static Value constant(double value) {
        if (!Double.isFinite(value)) throw new IllegalArgumentException("Value must be finite");
        return (life, random) -> value;
    }

    /** A uniform random value in {@code [min, max]}, stable for a given particle random. */
    public static Value range(double min, double max) {
        if (!Double.isFinite(min) || !Double.isFinite(max)) throw new IllegalArgumentException("Range endpoints must be finite");
        if (!(min <= max)) throw new IllegalArgumentException("Range min must not exceed max: " + min + " > " + max);
        return (life, random) -> min + (max - min) * clamp01(random);
    }

    /**
     * A piecewise-linear curve over normalized life. Points are {@code [t, value]} pairs sorted by
     * ascending {@code t}; sampling is clamped outside the first and last stop.
     */
    public static Value curve(double[][] points) {
        if (points == null || points.length == 0) throw new IllegalArgumentException("Curve requires at least one point");
        var stops = new double[points.length];
        var values = new double[points.length];
        for (int i = 0; i < points.length; i++) {
            if (points[i] == null || points[i].length != 2) throw new IllegalArgumentException("Curve point must be [t, value]");
            double t = points[i][0];
            if (!Double.isFinite(t) || t < 0 || t > 1) throw new IllegalArgumentException("Curve t must be within 0..1: " + t);
            if (!Double.isFinite(points[i][1])) throw new IllegalArgumentException("Curve value must be finite");
            stops[i] = t;
            values[i] = points[i][1];
            if (i > 0 && stops[i] < stops[i - 1]) throw new IllegalArgumentException("Curve points must ascend in t");
        }
        return (life, random) -> {
            double t = clamp01(life);
            if (t <= stops[0]) return values[0];
            if (t >= stops[stops.length - 1]) return values[values.length - 1];
            for (int i = 1; i < stops.length; i++) {
                if (t > stops[i]) continue;
                double span = stops[i] - stops[i - 1];
                if (span <= 0) return values[i];
                double mix = (t - stops[i - 1]) / span;
                return values[i - 1] + (values[i] - values[i - 1]) * mix;
            }
            return values[values.length - 1];
        };
    }

    /** Interpolates between two curves by the particle's stable random: 0 follows {@code first}, 1 follows {@code second}. */
    public static Value randomCurve(double[][] first, double[][] second) {
        var a = curve(first);
        var b = curve(second);
        return (life, random) -> {
            double lower = a.sample(life, random), upper = b.sample(life, random);
            return lower + (upper - lower) * clamp01(random);
        };
    }

    /**
     * Parses an authored value: number, {@code [min, max]}, a bare keypoint array
     * {@code [[t,v],...]}, {@code {curve: [[t,v],...]}} or {@code {curve: [...], random: [...]}}.
     *
     * @param element the value node; must not be null
     * @param path    JSON path used in error messages
     */
    public static Value read(JsonElement element, String path) {
        if (element == null || element.isJsonNull()) throw expected(path);
        if (element.isJsonPrimitive()) {
            if (!isNumber(element)) throw expected(path);
            return constant(element.getAsDouble());
        }
        if (element.isJsonArray()) {
            JsonArray array = element.getAsJsonArray();
            if (array.size() > 0 && array.get(0).isJsonArray()) return curve(readPoints(array, path));
            if (array.size() == 2 && isNumber(array.get(0)) && isNumber(array.get(1))) {
                double min = array.get(0).getAsDouble(), max = array.get(1).getAsDouble();
                if (!(min <= max)) throw new IllegalArgumentException(path + ": range min must not exceed max (" + min + " > " + max + ")");
                return range(min, max);
            }
            throw expected(path);
        }
        JsonObject object = element.getAsJsonObject();
        for (String key : object.keySet()) {
            if (!key.equals("curve") && !key.equals("random")) throw new IllegalArgumentException(path + ": unexpected key '" + key + "'");
        }
        if (!object.has("curve")) throw expected(path);
        double[][] first = readPoints(object.get("curve"), path + ".curve");
        if (!object.has("random")) return curve(first);
        double[][] second = readPoints(object.get("random"), path + ".random");
        return randomCurve(first, second);
    }

    private static double[][] readPoints(JsonElement element, String path) {
        if (element == null || !element.isJsonArray()) throw new IllegalArgumentException(path + ": expected [[t, value], ...]");
        JsonArray array = element.getAsJsonArray();
        if (array.size() == 0) throw new IllegalArgumentException(path + ": requires at least one point");
        var points = new double[array.size()][];
        for (int i = 0; i < array.size(); i++) {
            JsonElement point = array.get(i);
            if (point == null || !point.isJsonArray() || point.getAsJsonArray().size() != 2) throw new IllegalArgumentException(path + "[" + i + "]: expected [t, value]");
            JsonArray pair = point.getAsJsonArray();
            if (!isNumber(pair.get(0)) || !isNumber(pair.get(1))) throw new IllegalArgumentException(path + "[" + i + "]: t and value must be numbers");
            double t = pair.get(0).getAsDouble(), value = pair.get(1).getAsDouble();
            if (!(t >= 0 && t <= 1)) throw new IllegalArgumentException(path + "[" + i + "]: t must be within 0..1, got " + t);
            if (i > 0 && t < points[i - 1][0]) throw new IllegalArgumentException(path + "[" + i + "]: t must not descend, got " + t + " after " + points[i - 1][0]);
            points[i] = new double[] {t, value};
        }
        return points;
    }

    private static IllegalArgumentException expected(String path) {
        return new IllegalArgumentException(path + ": expected number, [min,max], [[t,value],...] or {curve}");
    }

    private static boolean isNumber(JsonElement element) {
        return element != null && element.isJsonPrimitive() && element.getAsJsonPrimitive().isNumber();
    }

    static double clamp01(double value) { return value < 0 ? 0 : value > 1 ? 1 : value; }
}
