package dev.worldcombat.core.world;

import dev.worldcombat.core.runtime.Point;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.level.pathfinder.Path;
import net.minecraft.world.phys.Vec3;

/** Private metadata on the original native path; native stop/replacement owns its lifetime. */
public interface NativePathGoal {
    Point worldcombat$goal();
    double worldcombat$within();
    void worldcombat$goal(Point goal, double within);

    static NativePathGoal finalGoal(Path path) {
        return path instanceof NativePathGoal value && value.worldcombat$goal() != null
            && !path.isDone() && path.getNextNodeIndex() == path.getNodeCount() - 1 ? value : null;
    }
    static boolean moveTo(PathNavigation navigation, Path candidate, Point goal, double within, double speed) {
        Point reached = candidate != null && candidate.canReach() ? goal : null;
        if (candidate != null) ((NativePathGoal) candidate).worldcombat$goal(reached, within);
        if (!navigation.moveTo(candidate, speed)) return false;
        // Native moveTo may retain an installed sameAs path; its nodes do not identify our exact goal or radius.
        var installed = navigation.getPath();
        if (installed != null) ((NativePathGoal) installed).worldcombat$goal(reached, within);
        return true;
    }
    default boolean worldcombat$arrived(Entity body) {
        return body.getBoundingBox().getCenter().distanceTo(MinecraftCombat.vec(worldcombat$goal())) <= worldcombat$within();
    }
    default Vec3 worldcombat$feet(Entity body) {
        var goal = worldcombat$goal();
        return new Vec3(goal.x(), goal.y() - body.getBbHeight() * .5, goal.z());
    }
}
