package dev.worldcombat.core.client.particles;

/**
 * Pure emission scheduling for one emitter: rate accumulator, burst/interval/repeats, start/stop
 * window and drain timing. No Minecraft dependency; all times are ticks.
 *
 * <p>Drain counts from the tick emission stops; {@code finished} becomes true once the drain window
 * elapses and no particles remain alive. Owned by wave 2.
 */
public final class EmitterSchedule {
    /** Sentinel for an emitter whose stop tick is supplied by {@link #stop()} rather than authored. */
    private static final int INFINITE = Integer.MAX_VALUE;

    private ParticleDefinition.EmitterSpec spec;
    private ParticleDefinition.Moment moment;
    private final double emitterRandom;
    private double accumulator;
    private long stoppedAt = Long.MIN_VALUE;
    private boolean stopped;
    private boolean hidden;

    public EmitterSchedule(ParticleDefinition.EmitterSpec spec, ParticleDefinition.Moment moment) {
        this(spec, moment, 0.5);
    }

    /**
     * @param emitterRandom stable per-emitter random in 0..1, handed to the rate {@link Value#sample}
     *                      so a random range or dual curve stays fixed for the emitter's lifetime
     */
    public EmitterSchedule(ParticleDefinition.EmitterSpec spec, ParticleDefinition.Moment moment, double emitterRandom) {
        if (spec == null) throw new IllegalArgumentException("EmitterSchedule requires an emitter spec");
        if (moment == null) throw new IllegalArgumentException("EmitterSchedule for '" + spec.name() + "' requires a moment");
        this.spec = spec;
        this.moment = moment;
        this.emitterRandom = emitterRandom < 0 ? 0 : emitterRandom > 1 ? 1 : emitterRandom;
    }

    public ParticleDefinition.EmitterSpec spec() { return spec; }

    /** Updates numeric inputs while retaining elapsed time, fractional rate carry and stop state. */
    public void update(ParticleDefinition.EmitterSpec spec, ParticleDefinition.Moment moment) {
        this.spec = spec;
        this.moment = moment;
    }

    /** The tick emission actually stops at: {@code spec.stop}, else {@code moment.stop}, else {@link Integer#MAX_VALUE}. */
    public int stopTick() {
        if (spec.stop() > 0) return spec.stop();
        if (moment.stop() > 0) return moment.stop();
        return INFINITE;
    }

    /** True while the emitter's start/stop window is open and it has not been stopped or hidden. */
    public boolean emitting(int tick) {
        return !stopped && !hidden && tick >= spec.start() && tick < stopTick();
    }

    /**
     * Number of particles to spawn this tick.
     *
     * @param tick      the tick within the moment, 0-based
     * @param lodFactor quality/distance scale, 0..1
     */
    public int spawnCount(int tick, double lodFactor) {
        return spawnCount(tick, lodFactor, 1);
    }

    /** Intensity scales authored emission separately from the quality factor. */
    public int spawnCount(int tick, double lodFactor, double intensity) {
        if (!emitting(tick)) return 0;
        double lod = lodFactor < 0 ? 0 : Math.min(lodFactor, 1);
        if (!(lod > 0) || !(intensity > 0)) return 0;
        long total = 0;
        if (spec.rate() != null) {
            double duration = moment.duration();
            double progress = duration > 0 ? Math.clamp((double) tick / duration, 0, 1) : 0;
            double rate = Math.max(0, spec.rate().sample(progress, emitterRandom));
            double requested = accumulator + rate / 20.0 * lod * intensity;
            double whole = Math.floor(requested);
            accumulator = Double.isFinite(requested) ? requested - whole : 0;
            total += (int) Math.min(Integer.MAX_VALUE, whole);
        }
        if (spec.burst() != null) {
            ParticleDefinition.BurstSpec burst = spec.burst();
            long elapsed = (long) tick - burst.at();
            if (elapsed >= 0 && elapsed % burst.interval() == 0 && elapsed / burst.interval() < burst.repeats()) {
                long count = Math.min(Integer.MAX_VALUE, Math.round(burst.count() * intensity));
                if (lod < 0.5 && count > 0) count = Math.max(1, count / 2);
                total += count;
            }
        }
        return (int) Math.min(Integer.MAX_VALUE, total);
    }

    /**
     * True once the emitter has stopped, its drain window has elapsed and no particle remains.
     *
     * @param tick  the tick within the moment, 0-based
     * @param alive currently live particles for this emitter
     */
    public boolean finished(int tick, int alive) {
        if (hidden) return true;
        int effective = stopTick();
        boolean windowClosed = effective != INFINITE && tick >= effective;
        if (!stopped && !windowClosed) return false;
        long stopMoment;
        if (stopped) {
            if (stoppedAt == Long.MIN_VALUE) stoppedAt = tick;
            stopMoment = Math.min(stoppedAt, effective);
        } else {
            stopMoment = effective;
        }
        return alive == 0 && tick >= stopMoment + moment.drain();
    }

    /** Stops emission; surviving particles finish their lifetimes (drain). */
    public void stop() { stopped = true; }

    /** Marks the emitter as hidden so no further particle survives. */
    public void hide() { hidden = true; }

    /** True when {@link #stop()} or {@link #hide()} was called. */
    public boolean stopped() { return stopped; }

    /** True when {@link #hide()} was called. */
    public boolean hidden() { return hidden; }

    /** The owning moment, for resolving end times. */
    public ParticleDefinition.Moment moment() { return moment; }
}
