package dev.worldcombat.core.runtime;

/** Neutral arithmetic checks; native collision/deflection is verified separately by integration. */
public final class ProjectileMotionChecks {
    public static void main(String[] args) {
        var initial = new Point(.1, 0, 0);
        var next = ProjectileMotion.next(initial, .1, .95);
        if (Math.abs(next.x() - .19) > 1e-12) throw new AssertionError("Acceleration precedes retention");
        var water = ProjectileMotion.next(initial, .1, .8);
        if (Math.abs(water.x() - .16) > 1e-12) throw new AssertionError("Water retention");
        if (ProjectileMotion.next(new Point(0, 0, 0), 1, 1).length() != 0) throw new AssertionError("No guessed heading");
        if (ProjectileMotion.next(new Point(-1, 0, 0), .1, .95).x() >= -1) throw new AssertionError("Reflected direction preserved");
        if (ProjectileMotion.next(new Point(1, 0, 0), 0, .99).x() != .99) throw new AssertionError("Default drag");
        for (double value : new double[]{-1, Double.NaN, Double.POSITIVE_INFINITY}) {
            try { ProjectileMotion.next(initial, value, .95); throw new AssertionError("Invalid acceleration accepted"); }
            catch (IllegalArgumentException expected) {}
        }
        System.out.println("PASS projectile motion: native-direction acceleration, air/water retention, zero and invalid input");
    }
}
