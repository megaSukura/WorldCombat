package dev.worldcombat.core.runtime;

/** Next velocity after a native movement/contact step, before gravity. Zero velocity has no invented heading. */
public final class ProjectileMotion {
    private ProjectileMotion() {}
    public static void validate(double acceleration, double drag) {
        if (!Double.isFinite(acceleration) || acceleration < 0 || !Float.isFinite((float) acceleration)
            || !Double.isFinite(drag) || drag < 0 || drag > 1)
            throw new IllegalArgumentException("Invalid projectile acceleration/drag");
    }
    public static Point next(Point velocity, double acceleration, double drag) {
        validate(acceleration, drag);
        double length = velocity.length();
        if (!Double.isFinite(length)) throw new IllegalArgumentException("Invalid projectile velocity");
        return length > 0 ? velocity.scale((length + acceleration) / length * drag) : velocity;
    }
}
