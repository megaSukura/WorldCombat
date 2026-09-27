package dev.worldcombat.core.runtime;

/** Native arithmetic captured without retaining an entity; the slope converts an owned ADD_VALUE contribution. */
public record AttributeObservation(double base, double value, double unclampedValue, double additionMultiplier) {
    public AttributeObservation(double base, double value) { this(base, value, value, 1); }
}
