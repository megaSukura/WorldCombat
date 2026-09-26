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
            var centre = combat.position(victim);
            var inside = combat.trace(actor,null,centre,centre.plus(new Point(.1,0,0)),.2);
            require(inside.hitEntity() && inside.target().equals(victim) && inside.position().minus(centre).length() < 1e-7,
                "Static ray starting within the native target body lost its initial contact");
            var edge = new Point(target.getBoundingBox().minX - (float).2,centre.y(),centre.z());
            var terminal = combat.trace(actor,null,combat.position(actor),edge,.2);
            require(terminal.hitEntity() && terminal.target().equals(victim), "Static ray lost an exact native expanded-box endpoint");
            var originalBox = target.getBoundingBox();
            target.setBoundingBox(new net.minecraft.world.phys.AABB(5.7, 100, 1.5, 8.7, 104, 2.5));
            var lowMin = new Point(5.5, 100, 1.8); var lowMax = new Point(6, 100.2, 2.2);
            require(java.util.Arrays.asList(combat.queryBox(actor, lowMin, lowMax, false)).contains(victim),
                "Low body-box query omitted a tall entity whose centre is outside the volume");
            var observed = combat.observe(actor, victim);
            require(observed.boundsMin().x() == 5.7 && observed.boundsMax().x() == 8.7 && observed.boundsMax().y() == 104,
                "Observation approximated the custom native AABB with nominal entity dimensions");
            target.setBoundingBox(originalBox);
            var start = combat.position(actor);
            var ray = combat.trace(actor, null, start, start.plus(new Point(6, 0, 0)), .2);
            require(ray.hitEntity() && ray.target().equals(victim)
                && Math.abs(ray.position().x() - (target.getBoundingBox().minX - (float) .2)) < 1e-6
                && Math.abs(ray.position().y() - start.y()) < 1e-6, "Trace returned target feet instead of native entry point");

            var ally = mob(EntityType.COW, level, 4);
            var scoreboard = level.getScoreboard(); var team = scoreboard.addPlayerTeam("contact-check");
            team.setAllowFriendlyFire(false);
            scoreboard.addPlayerToTeam(source.getScoreboardName(), team);
            scoreboard.addPlayerToTeam(ally.getScoreboardName(), team);
            try {
                var hostile = combat.trace(actor, null, start, start.plus(new Point(6, 0, 0)), .2);
                var contact = combat.trace(actor, null, start, start.plus(new Point(6, 0, 0)), .2, true);
                require(hostile.target().equals(victim), "Default trace no longer selects hostile contacts");
                require(contact.hitEntity() && contact.target().equals(combat.bind(ally)), "Opt-in trace ignored the nearer allied contact");
                require(!combat.damage(actor, contact.target(), null, 4), "Allied contact granted friendly damage permission");
            } finally {
                scoreboard.removePlayerTeam(team); ally.discard();
            }

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
            var wallRay = combat.trace(actor, null, combat.position(actor), combat.position(actor).plus(new Point(4, 0, 0)), .2);
            require(wallRay.blocked() && wallRay.blockPosition().x() == 5 && wallRay.blockFace().equals("west"), "Ray lost native wall surface facts");
            var blockOnly = combat.clipBlocks(actor, new Point(6, 103, 2), new Point(6, 99, 2));
            require(blockOnly != null && blockOnly.blocked() && blockOnly.target() == null && blockOnly.blockFace().equals("up")
                && blockOnly.position().y() == 100, "Block-only surface probe was intercepted by the target standing above the floor");
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
