package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.ActorHandle;
import dev.worldcombat.core.world.CombatServices;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native carrier ownership and actual vanilla NBT serialization, independent of authored move ids. */
public final class MobEffectLeaseChecks {
    private static final String CARRIER = "minecraft:slowness";
    private static final long OWNER = 9_900_000;
    private static boolean done;
    private static long bind(MinecraftCombat combat, long owner, ActorHandle target) {
        var observed = combat.mobEffect(target, CARRIER);
        require(observed != null, "Carrier missing before binding");
        long token = combat.leaseMobEffect(owner, target, CARRIER, observed.key());
        require(token > 0, "Current observation was not bound");
        return token;
    }
    public static void tick(MinecraftServer server) {
        if (done) return;
        done = true;
        try {
            var level = prepare(server); var combat = CombatServices.get(server);
            var source = mob(EntityType.PIG, level, 2); var target = mob(EntityType.COW, level, 4);
            var sourceHandle = combat.bind(source); var targetHandle = combat.bind(target);

            combat.marker(targetHandle, CARRIER, 200, 0);
            long first = bind(combat, OWNER + 1, targetHandle);
            require(combat.mobEffectLeasePresent(sourceHandle, first), "Fresh lease absent");
            combat.release(OWNER + 1, "check-normal-end");
            require(!target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Normal owner release left its carrier");

            combat.marker(targetHandle, CARRIER, 200, 0);
            var before = combat.mobEffect(targetHandle, CARRIER);
            long stale = bind(combat, OWNER + 2, targetHandle);
            combat.marker(targetHandle, CARRIER, 200, 0); // Same tick, duration and amplifier; native update may return false.
            require(!before.key().equals(combat.mobEffect(targetHandle, CARRIER).key()), "Identical refresh reused an application key");
            require(combat.leaseMobEffect(OWNER + 3, targetHandle, CARRIER, before.key()) == 0, "Stale observation claimed a refreshed state");
            require(!combat.mobEffectLeasePresent(sourceHandle, stale), "Refresh retained the old lease");
            combat.release(OWNER + 2, "check-old-owner");
            require(target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Old owner removed same-tick refresh");

            long older = bind(combat, OWNER + 4, targetHandle), newer = bind(combat, OWNER + 5, targetHandle);
            require(older != newer && !combat.mobEffectLeasePresent(sourceHandle, older), "Same-state claims did not change ownership");
            require(!combat.releaseMobEffectLease(OWNER + 4, newer), "Foreign owner released a lease");
            combat.release(OWNER + 4, "check-overlap");
            require(combat.mobEffectLeasePresent(sourceHandle, newer), "Older claim removed the new claim");
            combat.release(OWNER + 5, "check-current-owner");
            require(!target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Current owner could not release its claim");

            combat.marker(targetHandle, CARRIER, 200, 0);
            long forced = bind(combat, OWNER + 6, targetHandle);
            target.forceAddEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 200, 0), source);
            require(!combat.mobEffectLeasePresent(sourceHandle, forced), "Native instance replacement retained a lease");
            combat.release(OWNER + 6, "check-force-replacement");
            require(target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Release removed forceAddEffect replacement");
            long sameObject = bind(combat, OWNER + 11, targetHandle);
            target.forceAddEffect(target.getEffect(MobEffects.MOVEMENT_SLOWDOWN), source);
            require(!combat.mobEffectLeasePresent(sourceHandle, sameObject), "Same-object forced reapplication retained a lease");
            combat.release(OWNER + 11, "check-force-same-object");
            require(target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Release removed same-object forced reapplication");

            long cured = bind(combat, OWNER + 7, targetHandle);
            target.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
            require(!combat.mobEffectLeasePresent(sourceHandle, cured), "Native cure retained the claim");
            combat.marker(targetHandle, CARRIER, 200, 0);
            combat.release(OWNER + 7, "check-cure-reapply");
            require(target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Cured claim removed a newly applied carrier");

            // Exercise the actual LivingEntity save path and load its native output, rather than filtering a mock tag.
            long saved = bind(combat, OWNER + 8, targetHandle);
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 240, 0));
            var data = new CompoundTag(); target.saveWithoutId(data);
            var restored = EntityType.COW.create(level);
            require(restored != null, "Could not create native load fixture");
            restored.load(data);
            require(!restored.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Transient owned carrier survived native serialization");
            require(restored.hasEffect(MobEffects.MOVEMENT_SPEED), "Unrelated independent effect was filtered from the save");
            require(target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN) && combat.mobEffectLeasePresent(sourceHandle, saved), "Saving mutated the live carrier");
            combat.marker(targetHandle, CARRIER, 200, 0);
            var refreshedData = new CompoundTag(); target.saveWithoutId(refreshedData); restored.load(refreshedData);
            require(restored.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Same-id third-party refresh was excluded from native save");
            combat.release(OWNER + 8, "check-save-refresh");

            dev.worldcombat.core.world.MobEffectLeaseGrowthChecks.run(combat, sourceHandle, targetHandle, target);

            bind(combat, OWNER + 9, targetHandle);
            source.discard();
            require(combat.resolve(sourceHandle) == null, "Source handle stayed valid after departure");
            combat.release(OWNER + 9, "check-source-left");
            require(!target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Invalid source prevented raw host cleanup");

            combat.marker(targetHandle, CARRIER, 200, 0);
            bind(combat, OWNER + 10, targetHandle); target.discard();
            require(combat.resolve(targetHandle) == null, "Target handle stayed valid after departure");
            combat.release(OWNER + 10, "check-target-left");
            require(!target.hasEffect(MobEffects.MOVEMENT_SLOWDOWN), "Invalid target handle prevented captured-entity cleanup");
            System.out.println("P1CHECK PASS MobEffect leases: owner release, identical refresh, bounded refresh bookkeeping, ownership handoff, native replacement/cure, source/target departure and native save/load");
        } catch (Throwable error) {
            error.printStackTrace(); System.out.println("P1CHECK FAIL MobEffect leases: " + error);
        }
    }
}
