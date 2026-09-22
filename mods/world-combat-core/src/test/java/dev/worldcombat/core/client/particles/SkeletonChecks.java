package dev.worldcombat.core.client.particles;

import org.joml.Vector3f;

/**
 * Compile-time and behavioural checks for the pure engine classes. Runs without Minecraft and
 * exists to prove the test source set can reference the particle package. Owned by wave 0.
 */
public final class SkeletonChecks {
    private SkeletonChecks() {}

    public static void main(String[] args) {
        var first = new ParticleRandom(42L);
        var second = new ParticleRandom(42L);
        if (first.nextDouble() != second.nextDouble()) throw new AssertionError("ParticleRandom is not replayable");
        if (first.fork(1).nextDouble() != second.fork(1).nextDouble()) throw new AssertionError("ParticleRandom.fork is not replayable");

        if (Values.constant(1).sample(0.5, 0) != 1) throw new AssertionError("constant value changed");
        if (Values.range(2, 2).sample(0, 0.7) != 2) throw new AssertionError("degenerate range changed");
        if (Values.curve(new double[][] {{0, 0}, {1, 10}}).sample(0.5, 0) != 5) throw new AssertionError("curve midpoint wrong");

        var ramp = ColorGradient.of(new double[] {0, 1}, new int[] {0x000000, 0xFFFFFF}, -1);
        if ((ramp.rgb(0.5) & 0xFFFFFF) != 0x808080) throw new AssertionError("colour midpoint wrong: " + Integer.toHexString(ramp.rgb(0.5)));

        var state = new ParticleState(0, 0.5, 10);
        if (state.lifetime != 10 || state.random != 0.5 || !state.alive) throw new AssertionError("spawn description defaults wrong");

        var history = new AnchorHistory(4);
        history.record(1, 1, 2, 3);
        var out = new org.joml.Vector3d();
        if (!history.position(0, out) || out.x != 1 || out.y != 2 || out.z != 3) throw new AssertionError("history newest sample wrong");
        history.record(2, 4, 2, 3);
        if (Math.abs(history.distance(1) - 3) > 1e-9) throw new AssertionError("history distance wrong");

        var blend = Values.randomCurve(new double[][] {{0, 0}, {1, 0}}, new double[][] {{0, 10}, {1, 10}});
        if (blend.sample(0.5, 0.25) != 2.5) throw new AssertionError("random curve should interpolate by the particle random");

        var spawn = Shapes.point().sample(new ParticleRandom(1), 0, 1);
        if (spawn.direction().lengthSquared() == 0) throw new AssertionError("point shape needs a direction");

        System.out.println("SkeletonChecks PASS");
    }
}
