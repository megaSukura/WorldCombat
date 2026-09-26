package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.ActorHandle;
import dev.worldcombat.core.runtime.ExecutionOrigin;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;

/** Earliest observable native delivery: a direct projectile/body, or one native DamageSource object. */
final class NativeDamageOrigins {
    private final Map<Entity, ExecutionOrigin> entities = new WeakHashMap<>();
    private final Map<DamageSource, ExecutionOrigin> sources = new WeakHashMap<>();
    private long next, epoch = -1;
    ExecutionOrigin get(DamageSource cause, ActorHandle actor, long contentEpoch) {
        if (epoch != contentEpoch) { clear(); epoch = contentEpoch; }
        var direct = cause.getDirectEntity(); var source = cause.getEntity();
        if (source == null) return null;
        if (direct != null && direct != source) {
            var origin = entities.get(direct);
            if (origin == null || !origin.belongsTo(actor)) { origin = fresh(actor); entities.put(direct, origin); }
            return origin;
        }
        var origin = sources.get(cause);
        if (origin == null || !origin.belongsTo(actor)) { origin = fresh(actor); sources.put(cause, origin); }
        return origin;
    }
    private ExecutionOrigin fresh(ActorHandle source) { return new ExecutionOrigin("native:" + ++next, source, 0); }
    void clear() { entities.clear(); sources.clear(); }
}
