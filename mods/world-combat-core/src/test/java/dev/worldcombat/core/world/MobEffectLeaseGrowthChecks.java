package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.ActorHandle;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.effect.MobEffects;
import static dev.worldcombat.core.checks.TestWorld.require;

/** Package-local statistics verify live bookkeeping and actual host cleanup registrations. */
public final class MobEffectLeaseGrowthChecks {
    private static final String CARRIER = "minecraft:slowness";
    private static final long OWNER = 9_999_000;
    public static void run(MinecraftCombat combat, ActorHandle observer, ActorHandle target, LivingEntity entity) {
        var leases = combat.mobEffectLeases();
        int records = leases.recordCount(), owners = leases.ownerCount();
        long token = 0;
        for (int i = 0; i < 2048; i++) {
            combat.marker(target, CARRIER, 240, 0);
            require(leases.recordCount() == records, "Native refresh retained a retired record at iteration " + i);
            token = combat.leaseMobEffect(OWNER, target, CARRIER, combat.mobEffect(target, CARRIER).key());
            require(token > 0 && leases.recordCount() == records + 1 && leases.ownerTokenCount(OWNER) == 1,
                "Repeated refresh grew the owner's live token records");
            require(leases.ownerCount() == owners + 1 && combat.resourceLeaseCount(OWNER) == 1,
                "Repeated refresh registered another owner cleanup");
        }
        for (int i = 0; i < 2048; i++) {
            long previous = token;
            token = combat.leaseMobEffect(OWNER, target, CARRIER, combat.mobEffect(target, CARRIER).key());
            require(token != previous && !combat.mobEffectLeasePresent(observer, previous), "Rebinding retained the old token");
            require(leases.recordCount() == records + 1 && leases.ownerTokenCount(OWNER) == 1
                && combat.resourceLeaseCount(OWNER) == 1, "Same-snapshot rebinding accumulated records or cleanup closures");
        }

        require(combat.releaseMobEffectLease(OWNER, token), "Current token did not release");
        require(leases.recordCount() == records && leases.ownerTokenCount(OWNER) == 0
            && leases.ownerCount() == owners + 1 && combat.resourceLeaseCount(OWNER) == 1,
            "Empty owner forgot its already-registered cleanup");
        combat.marker(target, CARRIER, 240, 0);
        combat.leaseMobEffect(OWNER, target, CARRIER, combat.mobEffect(target, CARRIER).key());
        require(combat.resourceLeaseCount(OWNER) == 1, "Rebinding an empty owner registered duplicate cleanup");
        leases.reconcile(entity, MobEffects.MOVEMENT_SLOWDOWN);
        require(leases.recordCount() == records + 1, "An unchanged/cancelled removal retired a live claim");
        entity.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
        leases.reconcile(entity, MobEffects.MOVEMENT_SLOWDOWN);
        require(leases.recordCount() == records && leases.ownerTokenCount(OWNER) == 0
            && combat.resourceLeaseCount(OWNER) == 1, "Confirmed native removal retained the record or lost owner registration");
        combat.marker(target, CARRIER, 240, 0);
        combat.leaseMobEffect(OWNER, target, CARRIER, combat.mobEffect(target, CARRIER).key());

        long other = combat.leaseMobEffect(OWNER + 1, target, CARRIER, combat.mobEffect(target, CARRIER).key());
        require(leases.recordCount() == records + 1 && leases.ownerTokenCount(OWNER) == 0,
            "Ownership transfer retained an older claim record");
        combat.release(OWNER, "check-refresh-owner-ended");
        require(combat.mobEffectLeasePresent(observer, other), "Empty old owner removed the replacement owner's state");
        combat.release(OWNER + 1, "check-replacement-owner-ended");
        require(!entity.hasEffect(MobEffects.MOVEMENT_SLOWDOWN) && leases.recordCount() == records
            && leases.ownerCount() == owners && combat.resourceLeaseCount(OWNER) == 0
            && combat.resourceLeaseCount(OWNER + 1) == 0, "Owner release retained bookkeeping after refresh stress");
        combat.marker(target, CARRIER, 200, 0);
    }
}
