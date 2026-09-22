package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.ActorHandle;
import net.minecraft.core.Holder;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.LivingEntity;
import java.util.*;

/** Optional native carrier ownership. Each claim belongs to one existing action/effect resource owner. */
public final class WorldMobEffects {
    private record Lease(long token, long owner, LivingEntity entity, Holder<MobEffect> type,
                         MobEffectInstance instance, String expected) {}
    private final MinecraftCombat combat;
    private final Map<Long, Lease> leases = new HashMap<>();
    private final Map<LivingEntity, Map<Holder<MobEffect>, Long>> current = new IdentityHashMap<>();
    // Empty sets keep the one cleanup registration alive until the owner itself releases.
    private final Map<Long, Set<Long>> owners = new HashMap<>();
    private long nextToken;

    public WorldMobEffects(MinecraftCombat combat) { this.combat = combat; }

    public long bind(long owner, LivingEntity entity, Holder<MobEffect> type, String expected) {
        combat.checkThread();
        if (owner == 0) throw new IllegalArgumentException("A lifecycle owner is required for a MobEffect lease");
        var instance = entity.getEffect(type);
        if (instance == null || !MinecraftEffectState.capture(entity, instance).key().equals(expected)) return 0;
        applied(entity, type);
        var tokens = owners.get(owner);
        if (tokens == null) {
            tokens = new HashSet<>(); owners.put(owner, tokens);
            combat.lease(owner, () -> releaseOwner(owner));
        }
        long token = ++nextToken;
        var lease = new Lease(token, owner, entity, type, instance, expected);
        leases.put(token, lease);
        tokens.add(token);
        current.computeIfAbsent(entity, key -> new HashMap<>()).put(type, token);
        return token;
    }

    /** Native application and claim handoff retire old bookkeeping without touching the new native state. */
    public void applied(LivingEntity entity, Holder<MobEffect> type) {
        combat.checkThread();
        var values = current.get(entity);
        var token = values == null ? null : values.get(type);
        if (token != null) retire(leases.get(token));
    }

    /** Removal notifications arrive before native cancellation/removal finishes; reconcile at the host tick boundary. */
    public void reconcile(LivingEntity entity, Holder<MobEffect> type) {
        combat.checkThread();
        var values = current.get(entity);
        var token = values == null ? null : values.get(type);
        var lease = token == null ? null : leases.get(token);
        if (lease != null && !owns(lease)) retire(lease);
    }

    private void retire(Lease lease) {
        if (lease == null || !leases.remove(lease.token(), lease)) return;
        var tokens = owners.get(lease.owner());
        if (tokens != null) tokens.remove(lease.token());
        var values = current.get(lease.entity());
        if (values != null) {
            values.remove(lease.type(), lease.token());
            if (values.isEmpty()) current.remove(lease.entity());
        }
    }

    private void releaseOwner(long owner) {
        var tokens = owners.get(owner);
        if (tokens == null) return;
        RuntimeException failure = null;
        try {
            for (long token : List.copyOf(tokens)) {
                try { release(owner, token); }
                catch (RuntimeException error) {
                    if (failure == null) failure = error; else failure.addSuppressed(error);
                }
            }
        } finally { owners.remove(owner, tokens); }
        if (failure != null) throw failure;
    }

    int recordCount() { return leases.size(); }
    int ownerCount() { return owners.size(); }
    int ownerTokenCount(long owner) { var tokens = owners.get(owner); return tokens == null ? 0 : tokens.size(); }

    private boolean owns(Lease lease) {
        var values = current.get(lease.entity());
        if (values == null || !Objects.equals(values.get(lease.type()), lease.token())) return false;
        var instance = lease.entity().getEffect(lease.type());
        return instance == lease.instance() && instance != null
            && MinecraftEffectState.capture(lease.entity(), instance).key().equals(lease.expected());
    }

    public boolean present(ActorHandle observer, long token) {
        combat.checkThread();
        var lease = leases.get(token); var source = combat.resolve(observer);
        if (lease == null) return false;
        if (!owns(lease)) { retire(lease); return false; }
        return source != null && lease.entity().isAlive() && !lease.entity().isRemoved()
            && source.level() == lease.entity().level() && source.distanceToSqr(lease.entity()) <= 64 * 64;
    }

    /** Runtime claims are transient, even when a persistent effect will rebind on resume. Filter only the save copy. */
    public void saving(LivingEntity entity, net.minecraft.nbt.CompoundTag data) {
        combat.checkThread();
        var values = current.get(entity);
        if (values == null || !data.contains("active_effects", net.minecraft.nbt.Tag.TAG_LIST)) return;
        var effects = data.getList("active_effects", net.minecraft.nbt.Tag.TAG_COMPOUND);
        for (var token : List.copyOf(values.values())) {
            var lease = leases.get(token);
            if (lease == null) continue;
            if (!owns(lease)) { retire(lease); continue; }
            var expected = lease.instance().save();
            for (int i = effects.size() - 1; i >= 0; i--) if (effects.get(i).equals(expected)) effects.remove(i);
        }
        if (effects.isEmpty()) data.remove("active_effects");
    }

    /** Uses the captured native entity: owner invalidation must not need a still-valid script/actor handle. */
    public boolean release(long owner, long token) {
        combat.checkThread();
        var lease = leases.get(token);
        if (lease == null || lease.owner() != owner) return false;
        boolean owned = owns(lease);
        retire(lease);
        return owned && lease.entity().removeEffect(lease.type());
    }
}
