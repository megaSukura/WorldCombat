package dev.worldcombat.core.client.particles;

import org.joml.Vector3d;

/**
 * Ring buffer of an anchor's recent world positions, newest first. Used to place trail particles
 * along the anchor's path and to distribute a tick's spawns between the previous and current anchor
 * position. Double precision; pure logic, no Minecraft dependency.
 */
public final class AnchorHistory {
    private final double[] xs;
    private final double[] ys;
    private final double[] zs;
    private final long[] ticks;
    private int count;
    private int head;

    public AnchorHistory(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("Anchor history needs capacity >= 1");
        this.xs = new double[capacity];
        this.ys = new double[capacity];
        this.zs = new double[capacity];
        this.ticks = new long[capacity];
    }

    /** Records one tick's position, overwriting the oldest sample when full. */
    public void record(long tick, double x, double y, double z) {
        xs[head] = x;
        ys[head] = y;
        zs[head] = z;
        ticks[head] = tick;
        head = (head + 1) % xs.length;
        if (count < xs.length) count++;
    }

    /** Number of retained samples. */
    public int size() { return count; }

    /** Capacity in ticks. */
    public int capacity() { return xs.length; }

    /**
     * Reads a sample by age.
     *
     * @param age 0 is the newest sample, 1 the previous tick, and so on
     * @param out receives the position in blocks
     * @return false when {@code age} is outside the retained range
     */
    public boolean position(int age, Vector3d out) {
        int index = index(age);
        if (index < 0) return false;
        out.set(xs[index], ys[index], zs[index]);
        return true;
    }

    /** The tick recorded for the given age, or {@code Long.MIN_VALUE} when out of range. */
    public long tick(int age) {
        int index = index(age);
        return index < 0 ? Long.MIN_VALUE : ticks[index];
    }

    /** Interpolates along the path at a fractional age (0 = newest sample, 1 = previous tick, ...). */
    public boolean interpolate(double age, Vector3d out) {
        if (count == 0) return false;
        double clamped = Math.clamp(age, 0, count - 1);
        int newer = (int) Math.floor(clamped);
        int older = (int) Math.ceil(clamped);
        int a = index(newer);
        int b = index(older);
        if (a < 0 || b < 0) return false;
        double mix = clamped - newer;
        out.set(xs[a] + (xs[b] - xs[a]) * mix, ys[a] + (ys[b] - ys[a]) * mix, zs[a] + (zs[b] - zs[a]) * mix);
        return true;
    }

    /** Straight-line distance between the newest sample and the one {@code age} ticks older; 0 when unavailable. */
    public double distance(int age) {
        int a = index(0), b = index(age);
        if (a < 0 || b < 0) return 0;
        double dx = xs[a] - xs[b], dy = ys[a] - ys[b], dz = zs[a] - zs[b];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** Drops all samples. */
    public void clear() { count = 0; head = 0; }

    private int index(int age) {
        if (age < 0 || age >= count) return -1;
        return ((head - 1 - age) % xs.length + xs.length) % xs.length;
    }
}
