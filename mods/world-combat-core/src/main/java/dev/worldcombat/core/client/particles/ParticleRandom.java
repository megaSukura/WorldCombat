package dev.worldcombat.core.client.particles;

/**
 * Deterministic, replayable random stream. The same seed always yields the same sequence and the
 * same {@link #fork(int)} children, which is what makes a shared instance seed replayable. Pure
 * logic; no Minecraft dependency and no global state.
 */
public final class ParticleRandom {
    private static final long GOLDEN = 0x9E3779B97F4A7C15L;
    private static final long MULTIPLIER = 0x2545F4914F6CDD1DL;
    private long state;
    private double gaussian;
    private boolean hasGaussian;

    public ParticleRandom(long seed) {
        this.state = seed == 0 ? GOLDEN : seed;
    }

    /** The current internal state, usable to reconstruct this stream. */
    public long state() { return state; }

    /** Advances the stream and returns a uniform double in {@code [0, 1)}. */
    public double nextDouble() {
        return (nextBits() >>> 11) * 0x1.0p-53;
    }

    /** Advances the stream and returns a uniform float in {@code [0, 1)}. */
    public float nextFloat() { return (float) nextDouble(); }

    /** Returns a uniform int in {@code [0, bound)}; {@code bound} must be positive. */
    public int nextInt(int bound) {
        if (bound <= 0) throw new IllegalArgumentException("Random bound must be positive");
        return (int) (nextDouble() * bound);
    }

    /** Returns a standard normal sample (Box-Muller), cached between pairs. */
    public double nextGaussian() {
        if (hasGaussian) {
            hasGaussian = false;
            return gaussian;
        }
        double u1, u2, radius;
        do {
            u1 = 2 * nextDouble() - 1;
            u2 = 2 * nextDouble() - 1;
            radius = u1 * u1 + u2 * u2;
        } while (radius >= 1 || radius == 0);
        double scale = Math.sqrt(-2 * Math.log(radius) / radius);
        gaussian = u2 * scale;
        hasGaussian = true;
        return u1 * scale;
    }

    /**
     * Derives an independent child stream without advancing this one. Use a stable salt such as the
     * emitter index or particle ordinal so replays stay comparable.
     */
    public ParticleRandom fork(int salt) {
        return new ParticleRandom(mix(state ^ (GOLDEN * (salt + 1L))));
    }

    private long nextBits() {
        long x = state;
        x ^= x >>> 12;
        x ^= x << 25;
        x ^= x >>> 27;
        state = x;
        return x * MULTIPLIER;
    }

    private static long mix(long value) {
        value = (value ^ (value >>> 30)) * 0xBF58476D1CE4E5B9L;
        value = (value ^ (value >>> 27)) * 0x94D049BB133111EBL;
        return value ^ (value >>> 31);
    }
}
