package dev.worldcombat.core.world;

import dev.worldcombat.core.network.MountedMotionState;
import dev.worldcombat.core.runtime.ActorHandle;
import java.util.*;
import net.minecraft.network.protocol.game.ClientboundMoveVehiclePacket;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.network.PacketDistributor;

/** A scoped handoff between client driving and server-authored body movement. */
public final class NativeMountedMotion {
    private static final Map<LivingEntity, Long> CLIENT = Collections.synchronizedMap(new WeakHashMap<>());
    private static final class Lease {
        final LivingEntity entity; final ServerPlayer driver; final Set<Long> owners = new HashSet<>();
        long serial; boolean awaitingRelease;
        Lease(LivingEntity entity, ServerPlayer driver) { this.entity=entity; this.driver=driver; }
    }
    private final MinecraftCombat combat;
    private final Map<ActorHandle, Lease> leases = new HashMap<>();
    private long serial;
    NativeMountedMotion(MinecraftCombat combat) { this.combat=combat; }
    public static boolean eligible(LivingEntity entity) {
        return !entity.isPassenger() && entity.isVehicle() && entity.getControllingPassenger() instanceof net.minecraft.world.entity.player.Player
            && CombatServices.domain(entity).riderMotion(entity);
    }
    public static boolean active(Entity entity) {
        if (!(entity instanceof LivingEntity living) || !entity.isVehicle()) return false;
        if (entity.level().isClientSide()) return living.isVehicle() && CLIENT.getOrDefault(living, 0L) > 0;
        var combat=CombatServices.existing(entity.getServer());
        return combat != null && combat.mountedMotion().activeBody(living);
    }
    private boolean activeBody(LivingEntity entity) {
        return leases.values().stream().anyMatch(lease -> lease.entity==entity && !lease.owners.isEmpty() && current(lease));
    }
    private static boolean current(Lease lease) {
        return lease.entity.isAlive() && !lease.entity.isRemoved() && lease.driver.getVehicle()==lease.entity
            && lease.entity.getControllingPassenger()==lease.driver;
    }
    public void acquire(long owner, ActorHandle actor) {
        combat.checkThread();
        var entity=combat.resolve(actor);
        if (owner==0 || entity==null || !eligible(entity) || !(entity.getControllingPassenger() instanceof ServerPlayer driver)) return;
        var lease=leases.get(actor);
        if (lease!=null && !current(lease)) { close(lease); leases.remove(actor); lease=null; }
        if (lease==null) { lease=new Lease(entity,driver); leases.put(actor,lease); }
        boolean starting=lease.owners.isEmpty(); lease.owners.add(owner);
        if (starting) {
            lease.awaitingRelease=false; lease.serial=++serial;
            entity.setDeltaMovement(Vec3.ZERO);
            CombatServices.domain(entity).riderMotionChanged(entity,true);
            combat.stopMovement(actor);
            synchronize(lease);
            PacketDistributor.sendToPlayer(driver,new MountedMotionState(entity.getId(),lease.serial,true));
        }
    }
    public void release(long owner) {
        for (var lease:leases.values()) if (lease.owners.remove(owner) && lease.owners.isEmpty()) close(lease);
    }
    private void close(Lease lease) {
        lease.owners.clear(); lease.awaitingRelease=true; lease.serial=++serial;
        CombatServices.domain(lease.entity).riderMotionChanged(lease.entity,false);
        if (current(lease)) synchronize(lease);
        PacketDistributor.sendToPlayer(lease.driver,new MountedMotionState(lease.entity.getId(),lease.serial,false));
    }
    /** Release acknowledgement fences input packets sent before the final authoritative position. */
    public void acknowledge(ServerPlayer player,int entityId,long token) {
        leases.entrySet().removeIf(entry -> {
            var lease=entry.getValue();
            return lease.driver==player && lease.entity.getId()==entityId && lease.serial==token && lease.awaitingRelease;
        });
    }
    public boolean blocksDriver(ServerPlayer player) {
        for (var lease:leases.values()) if (lease.driver==player && current(lease)) {
            synchronize(lease); return true;
        }
        return false;
    }
    public void tick() {
        leases.entrySet().removeIf(entry -> {
            var lease=entry.getValue();
            if (!current(lease) || combat.resolve(entry.getKey())!=lease.entity) { close(lease); return true; }
            if (!lease.owners.isEmpty()) synchronize(lease);
            return false;
        });
    }
    private static void synchronize(Lease lease) {
        lease.entity.hurtMarked=true; lease.entity.hasImpulse=true;
        for (var passenger:lease.entity.getPassengers()) lease.entity.positionRider(passenger);
        lease.driver.connection.send(new ClientboundMoveVehiclePacket(lease.entity));
    }
    public void stop() { leases.values().forEach(this::close); leases.clear(); }
    public static void clientState(LivingEntity entity,long token,boolean active) {
        long previous=CLIENT.getOrDefault(entity,0L);
        if (Math.abs(previous)>token) return;
        CLIENT.put(entity,active?token:-token);
        if (active) entity.setDeltaMovement(Vec3.ZERO);
        CombatServices.domain(entity).riderMotionChanged(entity,active);
    }
}
