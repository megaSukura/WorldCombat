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

    /** Native received movement remains in NeoForge's event chain, before vanilla resistance. */
    public static void adjust(net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent event) {
        var entity = event.getEntity();
        if (event.isCanceled() || !(event.getStrength() > 0)
            || !(entity.level() instanceof net.minecraft.server.level.ServerLevel level)
            || !CombatServices.CONTENT.ready() || !CombatServices.CONTENT.hooks().has("world_combat:knockback_incoming")
            || !CombatServices.domain(entity).available(entity)) return;
        var combat = CombatServices.get(level.getServer());
        var actor = combat.bind(entity); var data = new com.google.gson.JsonObject();
        data.addProperty("strength", event.getStrength()); data.addProperty("originalStrength", event.getStrength());
        data.addProperty("ratioX", event.getRatioX()); data.addProperty("ratioZ", event.getRatioZ());
        var result = combat.runtime().event("world_combat:knockback_incoming", actor, actor, data.toString(), true);
        if (!result.rejection().isEmpty()) { event.setCanceled(true); return; }
        var resolved = com.google.gson.JsonParser.parseString(result.data()).getAsJsonObject();
        double strength = resolved.get("strength").getAsDouble(), x = resolved.get("ratioX").getAsDouble(), z = resolved.get("ratioZ").getAsDouble();
        if (!Double.isFinite(strength) || strength < 0 || strength > Float.MAX_VALUE || !Double.isFinite(x) || !Double.isFinite(z)) {
            event.setCanceled(true); return;
        }
        event.setStrength((float) strength); event.setRatioX(x); event.setRatioZ(z);
    }

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
