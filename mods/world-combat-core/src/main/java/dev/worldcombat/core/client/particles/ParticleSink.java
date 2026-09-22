package dev.worldcombat.core.client.particles;

/**
 * Where newly spawned particles go. The Minecraft client implementation ({@link MadParticleSink})
 * maps the emitter spec plus the spawn description onto a MadParticle option; tests use an
 * in-memory sink. Keeping this behind an interface lets {@link EmitterRuntime} run without Minecraft.
 *
 * <p>Units: position blocks, velocity blocks/tick, lifetime ticks, roll and spin degrees, colour
 * packed ARGB with the RGB channels in 0xRRGGBB. The director applies instance scale, tint and
 * intensity to the {@link ParticleState} before invoking {@link #spawn}: {@code state.size} already
 * includes the instance scale and {@code state.color} already includes the tint.
 */
public interface ParticleSink {
    /**
     * Accepts one freshly spawned particle. The state is already positioned, sized and coloured; the
     * sink must not mutate it. MadParticle owns simulation and rendering from this point on, so the
     * sink reads the spawn description exactly once and keeps no reference to it.
     *
     * @param emitter the owning emitter runtime (the MadParticle mapping reads its spec)
     * @param state   the spawn description; scale and tint are already folded in by the director
     */
    void spawn(EmitterRuntime emitter, ParticleState state);

    /** A sink that discards particles; useful for tests that only check scheduling. */
    ParticleSink NONE = (emitter, state) -> {};
}
