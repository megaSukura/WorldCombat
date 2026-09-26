package dev.worldcombat.core.world;

import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;

/** One native hurt invocation may reserve some existing health; unrelated or nested recipients remain independent. */
public final class NativeDamageFloor implements AutoCloseable {
    private static final ThreadLocal<NativeDamageFloor> CURRENT = new ThreadLocal<>();
    private final NativeDamageFloor previous;
    private final LivingEntity target;
    private final DamageSource cause;
    private final double minimum;
    private NativeDamageFloor(LivingEntity target, DamageSource cause, double minimum) {
        if (!Double.isFinite(minimum) || minimum < 0 || minimum > Float.MAX_VALUE) throw new IllegalArgumentException("Invalid minimum health");
        this.target = target; this.cause = cause; this.minimum = minimum;
        previous = CURRENT.get(); CURRENT.set(this);
    }
    public static NativeDamageFloor open(LivingEntity target, DamageSource cause, double minimum) { return new NativeDamageFloor(target, cause, minimum); }
    public static float limit(LivingEntity target, DamageSource cause, float damage) {
        var scope = CURRENT.get();
        if (scope == null || scope.minimum == 0 || scope.target != target || scope.cause != cause || !(damage > 0)) return damage;
        return (float) Math.min(damage, Math.max(0, target.getHealth() - scope.minimum));
    }
    @Override public void close() { if (previous == null) CURRENT.remove(); else CURRENT.set(previous); }
}
