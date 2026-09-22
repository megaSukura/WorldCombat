package dev.worldcombat.core.runtime;

/** Validates amounts at the double-to-float Minecraft boundary without a gameplay cap. */
public final class NativeAmounts {
    private NativeAmounts() {}
    public static float positive(double value) {
        float result = delta(value);
        if (result <= 0) throw new IllegalArgumentException("Amount must be positive");
        return result;
    }
    public static float delta(double value) {
        float result = (float) value;
        if (!Double.isFinite(value) || Math.abs(value) > Float.MAX_VALUE || !Float.isFinite(result) || result == 0)
            throw new IllegalArgumentException("Amount must be finite, nonzero and representable by Minecraft");
        return result;
    }
}
