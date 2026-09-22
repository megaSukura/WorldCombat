package dev.worldcombat.core.client.particles;

import org.joml.Vector3d;

/**
 * The description of one freshly generated particle, handed to the
 * {@link ParticleSink} which maps it into a MadParticle option. MadParticle owns simulation and
 * rendering from that point on, so this holds only spawn-time values and carries no per-tick
 * integration state. Pure POJO; no Minecraft dependency.
 *
 * <p>Units: position blocks (world coordinates), velocity blocks/tick, lifetime ticks, roll and spin
 * degrees, colour packed ARGB with the RGB channels in 0xRRGGBB and alpha 0..1.
 */
public final class ParticleState {
    /** Index of the owning emitter inside its instance. */
    public final int emitterIndex;
    /** Stable per-particle random in 0..1, used by value and colour sampling. */
    public final double random;
    /** World position at spawn, blocks. */
    public final Vector3d position = new Vector3d();
    /** Initial world velocity, blocks/tick. */
    public final Vector3d velocity = new Vector3d();
    /** Total lifetime ticks; at least 1. */
    public int lifetime = 1;
    /** Spawn quad size in blocks. */
    public float size = 1;
    /** Spawn packed ARGB colour (alpha byte ignored; see {@link #alpha}). */
    public int color = 0xFFFFFFFF;
    /** Spawn alpha 0..1. */
    public float alpha = 1;
    /** Spawn roll in degrees. */
    public float roll;
    /** Roll change per tick in degrees. */
    public float spin;
    /** False once the state should no longer be tracked; the sink discards it when it sees this. */
    public boolean alive = true;

    public ParticleState(int emitterIndex, double random, int lifetime) {
        this.emitterIndex = emitterIndex;
        this.random = random;
        this.lifetime = Math.max(1, lifetime);
    }
}
