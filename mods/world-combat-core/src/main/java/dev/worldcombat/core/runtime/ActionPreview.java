package dev.worldcombat.core.runtime;

import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;

/** Bounded drawing/placement data supplied by content. It carries no skill identities or rules. */
public record ActionPreview(String json, List<Point> cells, String rotation, boolean ground, boolean replace,
                            double radius, String motion, boolean lineOfSight, ActionInput.Spec input) {
    public static final ActionPreview EMPTY = parse("{}");
    public static ActionPreview parse(String json) {
        if (json == null) throw new IllegalArgumentException("Preview JSON is required");
        var data = JsonParser.parseString(json).getAsJsonObject();
        var cells = new ArrayList<Point>();
        if (data.has("cells")) for (var value : data.getAsJsonArray("cells")) {
            var cell = value.getAsJsonArray();
            if (cell.size() != 3) throw new IllegalArgumentException("Invalid preview cells");
            double x = cell.get(0).getAsDouble(), y = cell.get(1).getAsDouble(), z = cell.get(2).getAsDouble();
            if (!integer(x) || !integer(y) || !integer(z)) throw new IllegalArgumentException("Preview cells must be integer offsets within 16 blocks");
            cells.add(new Point(x, y, z));
        }
        String rotation = data.has("rotation") ? data.get("rotation").getAsString() : "none";
        String motion = data.has("motion") ? data.get("motion").getAsString() : "none";
        double radius = data.has("radius") ? data.get("radius").getAsDouble() : 0;
        if (!List.of("none", "cardinal").contains(rotation) || !List.of("none", "horizontal", "spatial").contains(motion)
            || !Double.isFinite(radius) || radius < 0 || radius > 16) throw new IllegalArgumentException("Invalid preview geometry");
        return new ActionPreview(data.toString(), List.copyOf(cells), rotation, flag(data, "ground"), flag(data, "replace"), radius, motion, flag(data, "lineOfSight"), ActionInput.Spec.parse(data));
    }
    private static boolean integer(double n) { return Double.isFinite(n) && Math.abs(n) <= 16 && n == Math.rint(n); }
    private static boolean flag(com.google.gson.JsonObject data, String key) { return data.has(key) && data.get(key).getAsBoolean(); }
}
