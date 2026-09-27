package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.*;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.*;
import java.util.*;

/** Ground-supported vertical assistance. Native body movement, terrain paths and all collision shapes stay in use. */
public final class NativeGroundLift {
    private record Setting(double height, double speed, double probe) {}
    private static final class Body {
        final LivingEntity entity;
        final Map<Long, Setting> owners = new LinkedHashMap<>();
        boolean supported;
        Body(LivingEntity entity) { this.entity = entity; }
    }
    private static final ResourceLocation GRAVITY = ResourceLocation.parse("world_combat_core:ground_lift");
    private final MinecraftCombat combat;
    private final Map<ActorHandle, Body> bodies = new HashMap<>();
    public NativeGroundLift(MinecraftCombat combat) { this.combat = combat; }
    public static boolean supported(LivingEntity entity) {
        var attribute = entity.getAttribute(PublicAttributes.GROUND_SUPPORT);
        return attribute != null && attribute.getValue() > .5 && !entity.isInLiquid() && !entity.isPassenger()
            && (!entity.isVehicle() || NativeMountedMotion.eligible(entity)) && !entity.isFallFlying();
    }
    public boolean acquire(long owner, ActorHandle actor, double height, double speed, double probe) {
        combat.checkThread();
        if (owner == 0 || !Double.isFinite(height) || !Double.isFinite(speed) || !Double.isFinite(probe)
            || height <= 0 || speed <= 0 || speed > 4 || probe < 0 || height + probe > 64)
            throw new IllegalArgumentException("Invalid ground lift geometry");
        var entity = combat.resolve(actor);
        if (entity == null || entity.getAttribute(Attributes.GRAVITY) == null || entity.isPassenger()
            || entity.isVehicle() && !NativeMountedMotion.eligible(entity)) return false;
        var body = bodies.computeIfAbsent(actor, ignored -> new Body(entity));
        body.owners.put(owner, new Setting(height,speed,probe));
        update(body); return true;
    }
    private static void gravity(Body body, boolean enabled) {
        var value = body.entity.getAttribute(Attributes.GRAVITY); if (value == null) return;
        if (enabled) {
            if (value.getModifier(GRAVITY) == null) value.addTransientModifier(new AttributeModifier(GRAVITY,-1,AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL));
        } else value.removeModifier(GRAVITY);
        var support = body.entity.getAttribute(PublicAttributes.GROUND_SUPPORT);
        if (support != null) {
            if (enabled && support.getModifier(GRAVITY) == null) support.addTransientModifier(new AttributeModifier(GRAVITY,1,AttributeModifier.Operation.ADD_VALUE));
            else if (!enabled) support.removeModifier(GRAVITY);
        }
        body.supported = enabled;
    }
    private static void update(Body body) {
        var entity = body.entity;
        if (!(entity.level() instanceof ServerLevel) || entity.isInLiquid() || entity.isPassenger()
            || entity.isVehicle() && !NativeMountedMotion.eligible(entity) || entity.isFallFlying()
            || !entity.isAlive() || body.owners.isEmpty()) { gravity(body,false); return; }
        var rule = body.owners.values().stream().max(Comparator.comparingDouble(Setting::height)).orElseThrow();
        ruleAttribute(entity,PublicAttributes.GROUND_LIFT_HEIGHT,rule.height());
        ruleAttribute(entity,PublicAttributes.GROUND_LIFT_SPEED,rule.speed());
        ruleAttribute(entity,PublicAttributes.GROUND_LIFT_PROBE,rule.probe());
        double floor=floor(entity,rule);
        if (!Double.isFinite(floor)) { gravity(body,false); return; }
        gravity(body,true);
        // The client owns driving. Apply the same vertical rule at the native controller's velocity output.
        if (entity.isVehicle() && !NativeMountedMotion.active(entity)) return;
        apply(entity,rule,floor);
    }
    private static double floor(LivingEntity entity,Setting rule) {
        var level=entity.level();
        var bounds = entity.getBoundingBox(); double floor = Double.NEGATIVE_INFINITY;
        double insetX = Math.min(.02,bounds.getXsize()/4), insetZ = Math.min(.02,bounds.getZsize()/4);
        double[][] samples = {{entity.getX(),entity.getZ()}, {bounds.minX+insetX,bounds.minZ+insetZ},
            {bounds.maxX-insetX,bounds.minZ+insetZ}, {bounds.minX+insetX,bounds.maxZ-insetZ}, {bounds.maxX-insetX,bounds.maxZ-insetZ}};
        for (var sample : samples) {
            var from = new Vec3(sample[0],bounds.minY + entity.maxUpStep() + .01,sample[1]);
            var to = new Vec3(sample[0],bounds.minY - rule.height() - rule.probe(),sample[1]);
            if (!level.hasChunkAt(net.minecraft.core.BlockPos.containing(from)) || !level.hasChunkAt(net.minecraft.core.BlockPos.containing(to))) continue;
            var hit = level.clip(new ClipContext(from,to,ClipContext.Block.COLLIDER,ClipContext.Fluid.ANY,entity));
            if (hit.getType() != HitResult.Type.BLOCK || hit.getDirection() != net.minecraft.core.Direction.UP
                || !level.getFluidState(hit.getBlockPos()).isEmpty() || hit.isInside()) continue;
            floor = Math.max(floor,hit.getLocation().y);
        }
        return floor;
    }
    private static void apply(LivingEntity entity,Setting rule,double floor) {
        var velocity = entity.getDeltaMovement();
        double error = floor + rule.height() - entity.getBoundingBox().minY;
        double correction = net.minecraft.util.Mth.clamp(error * .25 - velocity.y * .5,-rule.speed()*.25,rule.speed()*.25);
        entity.setDeltaMovement(velocity.add(0,correction,0));
        if (Math.abs(correction) > 1e-4) {
            entity.hasImpulse = true;
            if (entity instanceof net.minecraft.server.level.ServerPlayer) entity.hurtMarked = true;
        }
        if (Math.abs(error) < .12 && Math.abs(velocity.y) < .12) entity.fallDistance = 0;
    }
    /** Native vehicle steering keeps its horizontal velocity; ground assistance owns only vertical correction. */
    public static Vec3 riderVelocity(LivingEntity entity,Vec3 velocity) {
        if (!entity.isVehicle() || !supported(entity) || NativeMountedMotion.active(entity)) return velocity;
        var rule=new Setting(entity.getAttributeValue(PublicAttributes.GROUND_LIFT_HEIGHT),
            entity.getAttributeValue(PublicAttributes.GROUND_LIFT_SPEED),entity.getAttributeValue(PublicAttributes.GROUND_LIFT_PROBE));
        if (rule.height()<=0 || rule.speed()<=0) return velocity;
        double floor=floor(entity,rule); if (!Double.isFinite(floor)) return velocity;
        double error=floor+rule.height()-entity.getBoundingBox().minY;
        double correction=net.minecraft.util.Mth.clamp(error*.25-velocity.y*.5,-rule.speed()*.25,rule.speed()*.25);
        return velocity.add(0,correction,0);
    }
    private static void ruleAttribute(LivingEntity entity,net.minecraft.core.Holder<Attribute> type,double value) {
        var instance=entity.getAttribute(type); if (instance==null) return;
        var previous=instance.getModifier(GRAVITY);
        if (previous!=null && previous.amount()==value) return;
        instance.removeModifier(GRAVITY);
        if (value!=0) instance.addTransientModifier(new AttributeModifier(GRAVITY,value,AttributeModifier.Operation.ADD_VALUE));
    }
    public void tick() {
        for (var iterator = bodies.entrySet().iterator(); iterator.hasNext();) {
            var entry = iterator.next();
            if (combat.resolve(entry.getKey()) != entry.getValue().entity) { clear(entry.getValue()); iterator.remove(); }
            else update(entry.getValue());
        }
    }
    private static void clear(Body body) {
        gravity(body,false);
        ruleAttribute(body.entity,PublicAttributes.GROUND_LIFT_HEIGHT,0);
        ruleAttribute(body.entity,PublicAttributes.GROUND_LIFT_SPEED,0);
        ruleAttribute(body.entity,PublicAttributes.GROUND_LIFT_PROBE,0);
    }
    public void release(long owner) {
        bodies.entrySet().removeIf(entry -> {
            var body = entry.getValue(); body.owners.remove(owner);
            if (!body.owners.isEmpty()) { update(body); return false; }
            clear(body); return true;
        });
    }
    public void stop() { bodies.values().forEach(NativeGroundLift::clear); bodies.clear(); }
}
