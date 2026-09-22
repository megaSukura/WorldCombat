package dev.worldcombat.core.runtime;

public record Point(double x, double y, double z) {
    public Point {
        if (!Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(z))
            throw new IllegalArgumentException("Coordinates must be finite");
    }
    public Point plus(Point other) { return new Point(x + other.x, y + other.y, z + other.z); }
    public Point minus(Point other) { return new Point(x - other.x, y - other.y, z - other.z); }
    public Point scale(double factor) { return new Point(x * factor, y * factor, z * factor); }
    public double length() { return Math.sqrt(x * x + y * y + z * z); }
    public Point unit() {
        double length = length();
        if (length < 0.000001) throw new IllegalArgumentException("Direction must have a length");
        return scale(1.0 / length);
    }
}
