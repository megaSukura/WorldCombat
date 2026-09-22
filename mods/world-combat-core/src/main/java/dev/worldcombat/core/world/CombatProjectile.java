package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import java.util.function.Consumer;
import net.minecraft.network.syncher.*;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.projectile.ThrowableProjectile;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.*;

/**
 * A native throwable entity. Content supplies payloads; vanilla and NeoForge own movement and impacts.
 * Flight options ride in the appearance JSON: `homing` {target: uuid, turn: degrees/tick, delay: ticks, range: blocks},
 * `pierce` (entities passed through before settling), `bounce` (block rebounds, with `restitution` 0..1).
 */
public final class CombatProjectile extends ThrowableProjectile {
    private static final EntityDataAccessor<Float> GRAVITY = SynchedEntityData.defineId(CombatProjectile.class, EntityDataSerializers.FLOAT);
    private static final EntityDataAccessor<Float> RADIUS = SynchedEntityData.defineId(CombatProjectile.class, EntityDataSerializers.FLOAT);
    private static final EntityDataAccessor<String> APPEARANCE = SynchedEntityData.defineId(CombatProjectile.class, EntityDataSerializers.STRING);
    private MinecraftCombat combat;
    private long action;
    private double range, travelled;
    private int lifetime;
    private Consumer<Impact> impact;
    private Runnable complete;
    private boolean settled;
    private boolean hitAllies;
    private Vec3 impactOrigin;
    private java.util.UUID homingTarget;
    private double homingTurn, homingRange = 64;
    private int homingDelay, pierce, bounce;
    private double restitution = 0.6;
    private final java.util.Set<java.util.UUID> pierced = new java.util.HashSet<>();

    public CombatProjectile(EntityType<? extends CombatProjectile> type, Level level) { super(type, level); }
    @Override protected void defineSynchedData(SynchedEntityData.Builder builder) {
        builder.define(GRAVITY, 0f); builder.define(RADIUS, 0f); builder.define(APPEARANCE, "");
    }
    public void configure(MinecraftCombat combat, long action, LivingEntity owner, Vec3 origin, Vec3 velocity,
                          double gravity, double radius, double range, int lifetime, Consumer<Impact> impact, Runnable complete, String appearance) {
        this.combat = combat; this.action = action; this.range = range; this.lifetime = lifetime;
        this.impact = impact; this.complete = complete;
        setOwner(owner); setPos(origin); setDeltaMovement(velocity);
        entityData.set(GRAVITY, (float) gravity); entityData.set(RADIUS, (float) radius);
        entityData.set(APPEARANCE, Appearance.of(appearance).json());
        options(appearance);
    }
    private void options(String json) {
        if (json == null || json.isBlank()) return;
        try {
            var root = com.google.gson.JsonParser.parseString(json).getAsJsonObject();
            hitAllies = root.has("hitAllies") && root.get("hitAllies").getAsBoolean();
            if (root.has("homing") && root.get("homing").isJsonObject()) {
                var homing = root.getAsJsonObject("homing");
                homingTarget = homing.has("target") ? java.util.UUID.fromString(homing.get("target").getAsString().split("/")[0]) : null;
                homingTurn = homing.has("turn") ? Math.max(0, Math.min(90, homing.get("turn").getAsDouble())) : 6;
                homingDelay = homing.has("delay") ? Math.max(0, homing.get("delay").getAsInt()) : 0;
                if (homing.has("range")) homingRange = Math.max(1, Math.min(64, homing.get("range").getAsDouble()));
            }
            if (root.has("pierce")) pierce = Math.max(0, Math.min(64, root.get("pierce").getAsInt()));
            if (root.has("bounce")) bounce = Math.max(0, Math.min(64, root.get("bounce").getAsInt()));
            if (root.has("restitution")) restitution = Math.max(0, Math.min(1, root.get("restitution").getAsDouble()));
        } catch (RuntimeException ignored) { }
    }
    private void steer() {
        if (homingTarget == null || tickCount < homingDelay || !(level() instanceof net.minecraft.server.level.ServerLevel level)) return;
        var target = level.getEntity(homingTarget);
        if (!(target instanceof LivingEntity living) || !living.isAlive() || living.distanceToSqr(this) > homingRange * homingRange) return;
        var velocity = getDeltaMovement(); double speed = velocity.length();
        if (speed < 1e-4) return;
        var desired = living.getBoundingBox().getCenter().subtract(position()).normalize();
        var current = velocity.normalize();
        double angle = Math.acos(Math.max(-1, Math.min(1, current.dot(desired))));
        double maximum = Math.toRadians(homingTurn);
        Vec3 heading;
        if (angle <= maximum || angle < 1e-6) heading = desired;
        else {
            // Rotate `current` toward `desired` by the turn budget inside their shared plane.
            var axis = current.cross(desired);
            if (axis.lengthSqr() < 1e-9) return;
            axis = axis.normalize();
            double cos = Math.cos(maximum), sin = Math.sin(maximum);
            heading = current.scale(cos).add(axis.cross(current).scale(sin)).add(axis.scale(axis.dot(current) * (1 - cos)));
        }
        setDeltaMovement(heading.scale(speed));
    }
    public long action() { return action; }
    public float hitRadius() { return entityData.get(RADIUS); }
    public String appearance() { return entityData.get(APPEARANCE); }
    public Vec3 damageOrigin() { return impactOrigin == null ? position() : impactOrigin; }
    void damageOrigin(Vec3 origin) { impactOrigin = origin; }
    @Override protected double getDefaultGravity() { return entityData.get(GRAVITY); }
    @Override protected boolean canHitEntity(Entity entity) {
        if (!super.canHitEntity(entity) || pierced.contains(entity.getUUID())) return false;
        return combat == null || !(entity instanceof LivingEntity target) || !(getOwner() instanceof LivingEntity owner)
            || combat.mayHit(owner, target, null)
            || hitAllies && combat.friendly(combat.bind(owner), combat.bind(target));
    }
    @Override protected void onHit(HitResult hit) {
        impactOrigin = position();
        // Keeps block.onProjectileHit, projectile land game events and native entity interactions.
        super.onHit(hit);
        if (level().isClientSide || settled) return;
        Entity target = hit instanceof EntityHitResult entity ? entity.getEntity() : null;
        boolean continues = false;
        if (target != null && pierce > 0) { pierce--; pierced.add(target.getUUID()); continues = true; }
        else if (hit instanceof BlockHitResult block && bounce > 0) {
            bounce--; continues = true;
            var velocity = getDeltaMovement(); var normal = Vec3.atLowerCornerOf(block.getDirection().getNormal());
            var reflected = velocity.subtract(normal.scale(2 * velocity.dot(normal))).scale(restitution);
            setPos(block.getLocation().add(normal.scale(0.05)));
            setDeltaMovement(reflected);
            if (reflected.lengthSqr() < 1e-4) continues = false;
        }
        if (!continues) settled = true;
        impact.accept(new Impact(MinecraftCombat.point(hit.getLocation()), target instanceof LivingEntity living ? combat.bind(living) : null,
            hit.getType() == HitResult.Type.BLOCK, getStringUUID(), target == null ? "" : target.getStringUUID(),
            getOwner() instanceof LivingEntity owner ? combat.bind(owner) : null, MinecraftCombat.point(impactOrigin)));
        if (settled) { complete.run(); discard(); }
    }
    @Override public void tick() {
        // A copied/unconfigured native entity has no live action lease (e.g. a dimension transfer).
        if (!level().isClientSide && combat == null) { discard(); return; }
        Vec3 previous = position();
        if (!level().isClientSide && !settled) steer();
        super.tick(); // Native sweep, NeoForge impact event, deflection, water drag, gravity and rotation.
        if (level().isClientSide || settled) return;
        travelled += position().distanceTo(previous);
        if (tickCount >= lifetime || travelled >= range) discard();
    }
    @Override public void remove(RemovalReason reason) {
        super.remove(reason);
        if (!level().isClientSide && combat != null && (reason == RemovalReason.UNLOADED_TO_CHUNK
            || reason == RemovalReason.UNLOADED_WITH_PLAYER || reason == RemovalReason.CHANGED_DIMENSION)) {
            settled = true;
            combat.runtime().projectiles().cancel(action, getStringUUID());
            return;
        }
        if (!level().isClientSide && !settled && complete != null) { settled = true; complete.run(); }
    }
}
