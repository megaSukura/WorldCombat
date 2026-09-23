package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.block.Blocks;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Neutral native body-contact cases run alongside the existing native projectile fixture. */
public final class NativeSweepChecks {
    private NativeSweepChecks() {}
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var source = mob(EntityType.COW, level, 2); var target = mob(EntityType.COW, level, 6);
        var actor = combat.bind(source); var victim = combat.bind(target);
        try {
            var start = combat.position(actor);
            var ray = combat.trace(actor, null, start, start.plus(new Point(6, 0, 0)), .2);
            require(ray.hitEntity() && ray.target().equals(victim)
                && Math.abs(ray.position().x() - (target.getBoundingBox().minX - (float) .2)) < 1e-6
                && Math.abs(ray.position().y() - start.y()) < 1e-6, "Trace returned target feet instead of native entry point");

            target.moveTo(4, 100, 2);
            double gap = target.getBoundingBox().minX - source.getBoundingBox().maxX;
            var shortStep = combat.moveSweep(actor, null, new Point(gap - .1, 0, 0), .2);
            require(!shortStep.hitEntity() && !shortStep.blocked(), "A short body step hit before contact");
            source.moveTo(2, 100, 2);
            var endpoint = combat.moveSweep(actor, null, new Point(gap, 0, 0), .2);
            require(endpoint.hitEntity() && endpoint.target().equals(victim)
                && Math.abs(source.getBoundingBox().maxX - target.getBoundingBox().minX) < 1e-6, "Exact body endpoint lost its hit");
            source.moveTo(3.5, 100, 2);
            var touching = combat.moveSweep(actor, null, new Point(.2, 0, 0), .2);
            require(touching.hitEntity() && Math.abs(source.getX() - 3.5) < 1e-6, "Initial body overlap moved through its contact");
            require(!combat.moveSweep(actor, null, new Point(0, 0, 0), .2).hitEntity(), "Zero movement issued a contact");

            source.moveTo(2, 100, 2); target.moveTo(6, 100, 2);
            source.getAttribute(Attributes.SCALE).setBaseValue(3); source.refreshDimensions();
            var shortTarget = mob(EntityType.CHICKEN, level, 6); target.moveTo(13, 100, 2);
            try {
                var wide = combat.moveSweep(actor, null, new Point(3.5, 0, 0), .2);
                require(wide.hitEntity() && wide.target().equals(combat.bind(shortTarget)), "Wide/tall body missed a short native target");
                require(Math.abs(source.getBoundingBox().maxX - shortTarget.getBoundingBox().minX) < 1e-6, "Body sweep overran first contact");
            } finally { shortTarget.discard(); }
            source.getAttribute(Attributes.SCALE).setBaseValue(1); source.refreshDimensions();

            wall(level, true); source.moveTo(2, 100, 2); target.moveTo(6, 100, 2);
            var blocked = combat.moveSweep(actor, null, new Point(4, 0, 0), 1);
            require(blocked.blocked() && !blocked.hitEntity() && source.getBoundingBox().maxX <= 5 + 1e-6,
                "A body contact margin reached through native cover");
            source.moveTo(3, 100, 2); target.moveTo(13, 100, 2);
            var diagonal = combat.moveSweep(actor, null, new Point(3, 0, 1), .2);
            require(diagonal.blocked() && !diagonal.hitEntity() && source.getBoundingBox().maxX <= 5 + 1e-6,
                "Diagonal body sweep crossed a side wall");
            require(Math.abs((source.getX() - 3) / 3 - (source.getZ() - 2)) < 1e-6,
                "A blocked sweep slid sideways beyond its first straight contact");
            double alongWall = source.getZ();
            var tangent = combat.moveSweep(actor, null, new Point(0, 0, 1), .2);
            require(!tangent.blocked() && !tangent.hitEntity() && Math.abs(source.getZ() - alongWall - 1) < 1e-6,
                "Native wall tangency prevented movement along its face");
            wall(level, false);

            require(source.startRiding(target, true), "Mounted fixture failed to attach");
            boolean mounted = false;
            try { combat.moveSweep(actor, null, new Point(1, 0, 0), .2); }
            catch (ActionRejectedException refusal) { mounted = refusal.reason().equals("mounted-control"); }
            require(mounted, "Body sweep bypassed mounted-control");
            source.stopRiding();
            mark("Native body sweeps verified: entry receipt, exact endpoint, short step, wide/short bodies, cover, straight wall stop and mounted control");
        } finally {
            wall(level, false); source.discard(); target.discard();
        }
    }
    private static void wall(ServerLevel level, boolean solid) {
        for (int y = 100; y <= 104; y++) for (int z = 0; z < 6; z++)
            level.setBlockAndUpdate(new BlockPos(5, y, z), (solid ? Blocks.STONE : Blocks.AIR).defaultBlockState());
    }
}
