package dev.worldcombat.core.client.particles;

import org.joml.Vector3f;

/**
 * Spawn-volume sampler. Positions are local to the emitter anchor in blocks; directions are unit
 * vectors in the emitter's local frame. Pure logic; no Minecraft dependency.
 */
public interface Shape {
    /**
     * A sampled spawn point and initial direction.
     *
     * @param position  local offset from the anchor, blocks
     * @param direction unit initial direction
     */
    record Spawn(Vector3f position, Vector3f direction) {}

    /**
     * Samples one spawn.
     *
     * @param random deterministic per-particle stream
     * @param index   particle index within the current batch, 0-based
     * @param count   number of particles in the current batch
     */
    Spawn sample(ParticleRandom random, int index, int count);
}
