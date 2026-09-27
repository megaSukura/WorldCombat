package dev.worldcombat.core.world;

import net.minecraft.world.entity.LivingEntity;

/** A health payment keeps native damage attribution without making its payer its own retaliation target. */
public final class NativeSelfHarm implements AutoCloseable {
    private static final ThreadLocal<NativeSelfHarm> CURRENT = new ThreadLocal<>();
    private final NativeSelfHarm previous;
    private final LivingEntity payer;
    private NativeSelfHarm(LivingEntity source, LivingEntity recipient) {
        payer = source == recipient ? source : null;
        previous = CURRENT.get(); CURRENT.set(this);
    }
    public static NativeSelfHarm open(LivingEntity source, LivingEntity recipient) { return new NativeSelfHarm(source, recipient); }
    public static boolean active(LivingEntity entity) {
        for (var scope = CURRENT.get(); scope != null; scope = scope.previous) if (scope.payer == entity) return true;
        return false;
    }
    @Override public void close() { if (previous == null) CURRENT.remove(); else CURRENT.set(previous); }
}
