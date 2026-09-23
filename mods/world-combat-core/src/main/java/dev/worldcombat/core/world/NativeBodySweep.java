package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.*;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.*;
import net.minecraft.world.phys.shapes.VoxelShape;
import java.util.UUID;

/** Native straight body movement and its reached contact; damage and continuation belong to the caller. */
final class NativeBodySweep {
    private static final double EPSILON = 1e-7;
    private NativeBodySweep() {}

    static Impact move(MinecraftCombat combat, ActorHandle actor, UUID controllerId, Point delta, double radius) {
        var source = combat.resolve(actor);
        if (source == null) throw new ActionInactiveException("Actor left");
        if (source.isPassenger() || source.isVehicle()) throw new ActionRejectedException("mounted-control");
        var level = (ServerLevel) source.level();
        var body = source.getBoundingBox(); var start = body.getCenter();
        var motion = new Vec3(delta.x(), delta.y(), delta.z()); double length = motion.length();
        if (length <= EPSILON) return new Impact(point(start), null, false);
        var direction = motion.scale(1 / length);
        double halfX = body.getXsize() * .5, halfY = body.getYsize() * .5, halfZ = body.getZsize() * .5;
        var path = body.expandTowards(motion).inflate(EPSILON);
        double obstruction = Double.POSITIVE_INFINITY;
        for (var shape : level.getBlockCollisions(source, path))
            obstruction = Math.min(obstruction, obstruction(shape, start, direction, length, halfX, halfY, halfZ));
        for (var shape : level.getEntityCollisions(source, path))
            obstruction = Math.min(obstruction, obstruction(shape, start, direction, length, halfX, halfY, halfZ));
        if (!level.getWorldBorder().isWithinBounds(path))
            obstruction = Math.min(obstruction, obstruction(level.getWorldBorder().getCollisionShape(), start, direction, length, halfX, halfY, halfZ));

        double extentX = Math.max(halfX, radius), extentY = Math.max(halfY, radius), extentZ = Math.max(halfZ, radius);
        var targets = new AABB(start, start.add(motion)).inflate(extentX + EPSILON, extentY + EPSILON, extentZ + EPSILON);
        var controller = controllerId == null ? null : combat.server().getPlayerList().getPlayer(controllerId);
        LivingEntity victim = null; double contact = Double.POSITIVE_INFINITY;
        for (var entity : level.getEntities(source, targets, candidate -> candidate instanceof LivingEntity living && combat.mayHit(source, living, controller))) {
            var box = entity.getBoundingBox();
            double distance = entry(box.inflate(extentX, extentY, extentZ), start, direction, length);
            if (distance > obstruction + EPSILON || distance >= contact) continue;
            var centre = start.add(direction.scale(distance));
            var surface = closest(box, centre);
            // The ability's contact margin may extend past the physical body; native cover still separates bodies.
            var cover = level.clip(new ClipContext(centre, surface, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, source));
            if (cover.getType() != HitResult.Type.MISS && cover.getLocation().distanceToSqr(surface) > EPSILON * EPSILON) continue;
            victim = (LivingEntity) entity; contact = distance;
        }

        double requested = Math.min(length, Math.min(obstruction, contact));
        combat.displace(actor, actor, point(direction.scale(requested)), controllerId);
        var arrived = source.getBoundingBox().getCenter();
        var travelled = arrived.subtract(start); double forward = travelled.dot(direction);
        boolean reached = forward + EPSILON * 8 >= requested
            && travelled.subtract(direction.scale(forward)).lengthSqr() <= EPSILON * EPSILON * 64;
        if (victim != null && contact <= length && reached && forward + EPSILON * 8 >= contact)
            return new Impact(point(closest(victim.getBoundingBox(), arrived)), combat.bind(victim), false);
        return new Impact(point(arrived), null, obstruction <= length || !reached);
    }

    private static double obstruction(VoxelShape shape, Vec3 start, Vec3 direction, double length, double x, double y, double z) {
        double result = Double.POSITIVE_INFINITY;
        for (var box : shape.toAabbs()) {
            var expanded = box.inflate(x, y, z);
            // A resting body may travel along or away from a face; an inward move counts its initial contact.
            if (!entersAxis(expanded.minX, expanded.maxX, start.x, direction.x)
                || !entersAxis(expanded.minY, expanded.maxY, start.y, direction.y)
                || !entersAxis(expanded.minZ, expanded.maxZ, start.z, direction.z)) continue;
            result = Math.min(result, entry(expanded, start, direction, length));
        }
        return result;
    }

    private static boolean entersAxis(double min, double max, double value, double speed) {
        if (Math.abs(speed) < EPSILON) return value > min + EPSILON && value < max - EPSILON;
        if (Math.abs(value - min) <= EPSILON && speed < 0) return false;
        return Math.abs(value - max) > EPSILON || speed <= 0;
    }

    private static double entry(AABB box, Vec3 start, Vec3 direction, double length) {
        if (box.inflate(EPSILON).contains(start)) return 0;
        // AABB.clip excludes its exact endpoint. Extend only the query, then clamp the reached contact to this step.
        var clipped = box.clip(start, start.add(direction.scale(length + EPSILON)));
        if (clipped.isEmpty()) return Double.POSITIVE_INFINITY;
        double distance = clipped.get().subtract(start).dot(direction);
        return distance <= length + EPSILON ? Math.max(0, Math.min(length, distance)) : Double.POSITIVE_INFINITY;
    }

    private static Vec3 closest(AABB box, Vec3 point) {
        return new Vec3(Math.clamp(point.x, box.minX, box.maxX), Math.clamp(point.y, box.minY, box.maxY), Math.clamp(point.z, box.minZ, box.maxZ));
    }
    private static Point point(Vec3 value) { return new Point(value.x, value.y, value.z); }
}
