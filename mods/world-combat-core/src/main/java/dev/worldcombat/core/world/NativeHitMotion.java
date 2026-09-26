package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.ActorHandle;
import dev.worldcombat.core.runtime.Point;
import java.util.UUID;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.CommonHooks;

/** Received movement. Scripted locomotion continues to use motion/displace. */
public final class NativeHitMotion {
    private NativeHitMotion() {}

    private static LivingEntity recipient(MinecraftCombat combat, ActorHandle source, ActorHandle target, UUID controller) {
        var origin = combat.resolve(source); var entity = combat.resolve(target);
        if (origin == null || entity == null || entity.isPassenger() || entity.isVehicle()) return null;
        var player = controller == null ? null : origin.getServer().getPlayerList().getPlayer(controller);
        return combat.mayAct(source, controller) && combat.mayHit(origin, entity, player) ? entity : null;
    }

    /** Positive direction points away from the hit; vanilla owns damping and grounded lift. */
    public static boolean knockback(MinecraftCombat combat, ActorHandle source, ActorHandle target, UUID controller,
                                    double strength, Point direction) {
        var entity = recipient(combat, source, target, controller);
        if (entity == null || !(strength > 0) || direction.x() * direction.x() + direction.z() * direction.z() < 1.0e-12) return false;
        var before = entity.getDeltaMovement();
        entity.knockback(strength, -direction.x(), -direction.z());
        return changed(entity, before);
    }

    /**
     * Adds a three-dimensional received impulse. The native event's strength is the vector length; its ratios
     * change horizontal heading, preserving the requested pitch. A vertical impulse stays vertical. Event
     * cancellation/strength edits apply first, followed by native knockback resistance exactly once.
     */
    public static boolean impulse(MinecraftCombat combat, ActorHandle source, ActorHandle target, UUID controller, Point impulse) {
        var entity = recipient(combat, source, target, controller);
        if (entity == null) return false;
        var push = permitted(entity, impulse);
        var before = entity.getDeltaMovement();
        entity.setDeltaMovement(before.add(push));
        return changed(entity, before);
    }

    /** Received position correction in blocks, retaining native collision and authored displacement units. */
    public static double displace(MinecraftCombat combat, ActorHandle source, ActorHandle target, UUID controller, Point delta) {
        var entity = recipient(combat, source, target, controller);
        if (entity == null) return 0;
        var push = permitted(entity, delta);
        return push.lengthSqr() < 1.0e-18 ? 0 : combat.displace(source, target, MinecraftCombat.point(push), controller);
    }

    private static Vec3 permitted(LivingEntity entity, Point impulse) {
        double magnitude = impulse.length();
        if (!(magnitude > 1.0e-9)) return Vec3.ZERO;
        var event = CommonHooks.onLivingKnockBack(entity, (float) magnitude, -impulse.x(), -impulse.z());
        if (event.isCanceled()) return Vec3.ZERO;
        double strength = event.getStrength(), resistance = entity.getAttributeValue(Attributes.KNOCKBACK_RESISTANCE);
        if (!(strength > 0) || !Double.isFinite(strength) || !Double.isFinite(resistance)) return Vec3.ZERO;
        double factor = strength / magnitude * Math.max(0, Math.min(1, 1 - resistance));
        if (!(factor > 0)) return Vec3.ZERO;
        double horizontal = Math.hypot(impulse.x(), impulse.z());
        double ratio = Math.hypot(event.getRatioX(), event.getRatioZ());
        if (!Double.isFinite(ratio)) return Vec3.ZERO;
        return new Vec3(horizontal > 1.0e-9 && ratio > 1.0e-9 ? -event.getRatioX() / ratio * horizontal * factor : 0,
            impulse.y() * factor,
            horizontal > 1.0e-9 && ratio > 1.0e-9 ? -event.getRatioZ() / ratio * horizontal * factor : 0);
    }

    private static boolean changed(LivingEntity entity, Vec3 before) {
        if (entity.getDeltaMovement().distanceToSqr(before) < 1.0e-18) return false;
        entity.hurtMarked = true; entity.hasImpulse = true;
        return true;
    }
}
