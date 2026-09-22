package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.Point;
import dev.worldcombat.core.runtime.ActionPreview;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/** Geometry shared by server effects and client previews. */
public final class CombatGeometry {
    public static List<BlockPos> cells(ActionPreview preview, Point point, Point direction) {
        BlockPos center = BlockPos.containing(point.x(), point.y(), point.z());
        var cells = new ArrayList<BlockPos>();
        for (var offset : preview.cells()) {
            int x = (int) offset.x(), z = (int) offset.z();
            if (preview.rotation().equals("cardinal")) {
                if (Math.abs(direction.x()) >= Math.abs(direction.z())) {
                    int previous = x; x = direction.x() >= 0 ? z : -z; z = direction.x() >= 0 ? -previous : previous;
                } else if (direction.z() < 0) { x = -x; z = -z; }
            }
            cells.add(center.offset(x, (int) offset.y(), z));
        }
        return List.copyOf(cells);
    }
    public static String placementReason(Level level, List<BlockPos> cells, boolean ground, boolean replace) {
        for (var pos : cells) {
            if (!level.hasChunkAt(pos) || !level.getWorldBorder().isWithinBounds(pos) || level.isOutsideBuildHeight(pos)) return "out-of-range";
            if (!replace && !level.getBlockState(pos).isAir()) return "space-occupied";
            if (!level.getEntitiesOfClass(LivingEntity.class, new AABB(pos), e -> e.isAlive() && !e.isSpectator()).isEmpty())
                return "space-occupied";
            if (ground && !cells.contains(pos.below()) && !level.getBlockState(pos.below()).isFaceSturdy(level, pos.below(), Direction.UP))
                return "needs-ground";
        }
        return "";
    }
    public static Vec3 step(Vec3 from, Vec3 to, double limit, boolean horizontal) {
        Vec3 delta = new Vec3(to.x - from.x, horizontal ? 0 : to.y - from.y, to.z - from.z);
        return delta.length() <= limit ? delta : delta.normalize().scale(limit);
    }
    public static Vec3 motionEnd(LivingEntity entity, Point point, double limit, boolean horizontal) {
        Vec3 motion = step(entity.position(), MinecraftCombat.vec(point), limit, horizontal);
        return entity.position().add(net.minecraft.world.entity.Entity.collideBoundingBox(entity, motion, entity.getBoundingBox(),
            entity.level(), entity.level().getEntityCollisions(entity, entity.getBoundingBox().expandTowards(motion))));
    }
}
