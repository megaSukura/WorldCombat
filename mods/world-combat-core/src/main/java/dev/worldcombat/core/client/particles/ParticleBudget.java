package dev.worldcombat.core.client.particles;

import java.util.Collection;
import net.minecraft.client.ParticleStatus;

/**
 * Global particle budget and quality scaling. Caps are expressed in estimated survivors: 60000 live
 * particles total, 6000 per instance and 3000 per emitter. Owned by wave 3.
 */
public final class ParticleBudget {
    public static final int GLOBAL_LIMIT = 60000;
    public static final int INSTANCE_LIMIT = 6000;
    public static final int EMITTER_LIMIT = 3000;

    private static final double NEAR_DISTANCE = 24;
    private static final double FAR_DISTANCE = 48;
    private static final double FAR_FACTOR = 0.3;

    private int live;

    /** Live particle count tracked by this budget. */
    public int live() { return live; }

    public void add(int count) { if (count > 0) live += count; }

    public void remove(int count) { if (count > 0) live = Math.max(0, live - count); }

    /** Recomputes {@link #live} as the sum of every instance's estimated survivors. */
    public void refresh(Collection<ParticleInstance> instances) {
        int total = 0;
        if (instances != null) {
            for (ParticleInstance instance : instances) {
                if (instance != null) total += Math.max(0, instance.particleCount());
            }
        }
        live = total;
    }

    /**
     * Quality/distance emission scale in 0..1.
     *
     * <p>Base by {@link ParticleStatus}: ALL 1, DECREASED 0.5, MINIMAL 0.25. Distance holds full
     * scale to 24 blocks, then falls linearly to 0.3 at 48 blocks.
     */
    public double lodFactor(ParticleStatus status, double distance) {
        double base = switch (status) {
            case ALL -> 1;
            case DECREASED -> 0.5;
            case MINIMAL -> 0.25;
        };
        double range = distance <= NEAR_DISTANCE ? 1
            : distance >= FAR_DISTANCE ? FAR_FACTOR
            : 1 - (distance - NEAR_DISTANCE) / (FAR_DISTANCE - NEAR_DISTANCE) * (1 - FAR_FACTOR);
        return base * range;
    }

    /** True when another particle may spawn for this emitter without exceeding any cap. */
    public boolean allow(ParticleInstance instance, EmitterRuntime emitter) {
        int amount = emitter.spec().amount();
        return (long) live + amount <= GLOBAL_LIMIT
            && (long) instance.particleCount() + amount <= INSTANCE_LIMIT
            && (long) emitter.particleCount() + amount <= EMITTER_LIMIT;
    }
}
