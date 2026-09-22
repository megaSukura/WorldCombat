package dev.worldcombat.core.client.particles;

/**
 * A scalar authored over normalized particle life. Pure logic; no Minecraft dependency.
 */
@FunctionalInterface
public interface Value {
    /**
     * Samples the value.
     *
     * @param life   normalized particle lifetime, clamped by callers to 0..1
     * @param random a stable per-particle value in 0..1, used by random ranges and dual curves
     * @return the scalar value in the author's unit
     */
    double sample(double life, double random);
}
