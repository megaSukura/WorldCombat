package dev.worldcombat.core.runtime;

/** Detached native body volume; normalized anchors follow translation and dimension changes. */
public record BodyBounds(Point min, Point max) {
    public BodyBounds {
        if (min == null || max == null || min.x() > max.x() || min.y() > max.y() || min.z() > max.z())
            throw new IllegalArgumentException("Invalid body bounds");
    }
    private static double clamp(double value, double low, double high) { return Math.max(low, Math.min(high, value)); }
    public Point closest(Point point) {
        return new Point(clamp(point.x(), min.x(), max.x()), clamp(point.y(), min.y(), max.y()), clamp(point.z(), min.z(), max.z()));
    }
    private static double relative(double value, double low, double high) { return high == low ? .5 : clamp((value - low) / (high - low), 0, 1); }
    public Point anchor(Point point) {
        return new Point(relative(point.x(), min.x(), max.x()), relative(point.y(), min.y(), max.y()), relative(point.z(), min.z(), max.z()));
    }
    public Point at(Point anchor) {
        return new Point(min.x() + (max.x() - min.x()) * clamp(anchor.x(), 0, 1),
            min.y() + (max.y() - min.y()) * clamp(anchor.y(), 0, 1),
            min.z() + (max.z() - min.z()) * clamp(anchor.z(), 0, 1));
    }
}
