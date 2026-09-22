package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import java.util.*;

/** Temporary entity ownership, bounded creation and cleanup independent of successful script callbacks. */
public final class WorldHelpers {
    private record Lease(long owner, ActorHandle source, HelperActor entity, String data, long until) {}
    private final MinecraftCombat combat;
    private final Map<UUID, Lease> leases = new LinkedHashMap<>();
    WorldHelpers(MinecraftCombat combat) { this.combat = combat; }
    public ActorHandle create(long owner, ActorHandle source, Point point, double health, String data, int ticks) {
        float nativeHealth = NativeAmounts.positive(health);
        if (owner == 0) throw new IllegalArgumentException("Helper bodies require an action or effect owner");
        var actor = combat.resolve(source);
        if (actor == null) throw new ActionInactiveException("Helper source unavailable");
        var level = (net.minecraft.server.level.ServerLevel) actor.level();
        var entity = CombatWorldContent.HELPER.get().create(level);
        if (entity == null) throw new IllegalStateException("Helper creation failed");
        entity.moveTo(point.x(), point.y(), point.z());
        if (!level.hasChunkAt(entity.blockPosition()) || !level.getWorldBorder().isWithinBounds(entity.getBoundingBox())
            || !level.noCollision(entity)) throw new ActionRejectedException("space-occupied");
        var maximum = entity.getAttribute(net.minecraft.world.entity.ai.attributes.Attributes.MAX_HEALTH);
        if (maximum == null || maximum.getAttribute().value().sanitizeValue(health) != health)
            throw new ActionRejectedException("helper-health-out-of-range");
        maximum.setBaseValue(health);
        entity.setHealth(nativeHealth); entity.setSilent(true); entity.addTag("world_combat:helper");
        entity.appearance(Appearance.of(data).json());
        leases.put(entity.getUUID(), new Lease(owner, source, entity, data, level.getGameTime() + ticks));
        if (!level.addFreshEntity(entity)) { leases.remove(entity.getUUID()); throw new ActionRejectedException("helper-refused"); }
        return combat.bind(entity);
    }
    public ActorHandle source(ActorHandle helper) { var lease = leases.get(helper.entity()); return lease == null ? null : lease.source(); }
    public String data(ActorHandle helper) { var lease = leases.get(helper.entity()); return lease == null ? "{}" : lease.data(); }
    public void remove(ActorHandle source, ActorHandle helper) {
        var lease = leases.get(helper.entity());
        if (lease != null && lease.source().equals(source)) remove(lease);
    }
    private void remove(Lease lease) {
        if (!leases.remove(lease.entity().getUUID(), lease)) return;
        if (!lease.entity().isRemoved()) lease.entity().discard();
    }
    public void release(long owner) { for (var lease : List.copyOf(leases.values())) if (lease.owner() == owner) remove(lease); }
    public void tick() { for (var lease : List.copyOf(leases.values())) if (!combat.valid(lease.source()) || !lease.entity().isAlive()
        || lease.entity().isRemoved() || lease.entity().level().getGameTime() >= lease.until()) remove(lease); }
    public int count() { return leases.size(); }
    public boolean owns(HelperActor entity) {
        var lease = leases.get(entity.getUUID());
        return lease != null && lease.entity() == entity;
    }
    public void stop() { for (var lease : List.copyOf(leases.values())) remove(lease); }
}
