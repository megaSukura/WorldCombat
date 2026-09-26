package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.MinecraftCombat;
import dev.worldcombat.core.world.PublicAttributes;
import dev.worldcombat.core.world.NativePathGoal;
import dev.worldcombat.core.runtime.Point;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.Vec3;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native physical coefficients remain local to one body and restore with their attribute owner. */
public final class NativeLocomotionChecks {
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2); body.setNoAi(false); var actor = combat.bind(body);
        try {
            double ordinary = drift(body);
            require(combat.attribute(-920001, actor, "world_combat:ground_slipperiness", .9, "add_value"), "Body slipperiness attribute missing");
            double polished = drift(body);
            require(polished > ordinary + .05 && polished < .4, "Native travel did not apply the body coefficient with finite damping: " + ordinary + " -> " + polished);
            combat.release(-920001, "checks:ended");
            require(body.getAttributeValue(PublicAttributes.GROUND_SLIPPERINESS) == 0 && Math.abs(drift(body) - ordinary) < 1e-6,
                "Ending the physical modifier did not restore native terrain friction");
            double baseline = combat.attributeValue(actor, actor, "minecraft:generic.movement_speed").value();
            combat.attribute(-920001, actor, "minecraft:generic.movement_speed", 1, "add_multiplied_total");
            combat.attribute(-920002, actor, "minecraft:generic.movement_speed", .5, "add_multiplied_total");
            require(Math.abs(combat.attributeValue(actor, actor, "minecraft:generic.movement_speed", -920001).value() - baseline * 1.5) < 1e-7,
                "Own-free baseline discarded another source or included itself");
            require(Math.abs(combat.attributeValue(actor, actor, "minecraft:generic.movement_speed").value() - baseline * 3) < 1e-7,
                "Read-only baseline mutated native modifiers");
            combat.release(-920002, "checks:ended");
            body.moveTo(2.5, 100, 2.5); body.setOnGround(true); body.setDeltaMovement(Vec3.ZERO);
            var goal = new Point(4.90175, 100 + body.getBbHeight() * .5, 2.5); double within = 2.05;
            var navigation = body.getNavigation(); navigation.stop();
            var coarse = navigation.createPath(goal.x(), 100, goal.z(), (int) Math.floor(within));
            require(coarse != null && coarse.canReach() && coarse.getNodeCount() > 0, "Coarse native navigation fixture had no reachable path");
            var coarseEnd = coarse.getEntityPosAtNode(body, coarse.getNodeCount() - 1).add(0, body.getBbHeight() * .5, 0);
            require(coarseEnd.distanceTo(MinecraftCombat.vec(goal)) > within, "Coarse fixture did not expose the integer-node reach mismatch");
            require(combat.navigate(actor, goal, within, 1).equals("moving"), "Continuous reach refinement refused an open native route");
            var refined = navigation.getPath();
            require(refined != null && refined.getNodeCount() > 0, "Refinement lost the native route");
            var end = refined.getEntityPosAtNode(body, refined.getNodeCount() - 1).add(0, body.getBbHeight() * .5, 0);
            require(end.distanceTo(MinecraftCombat.vec(goal)) <= within && end.distanceToSqr(body.position().add(0, body.getBbHeight() * .5, 0)) > .01,
                "Navigation retained a reachable zero-step path outside the requested continuous reach");
            combat.release(-920001, "checks:ended"); navigation.stop();
            combat.controlled(-920003, actor, true);
            require(combat.attribute(-920003, actor, "minecraft:generic.scale", 2, "add_multiplied_total"), "Large native navigation fixture could not scale");
            body.refreshDimensions(); body.moveTo(8.5, 100, 2.5); body.setOnGround(true); body.setNoGravity(false); body.setDeltaMovement(Vec3.ZERO);
            var precise = new Point(2.2, 100 + body.getBbHeight() * .5, 2.5); double close = .35;
            require(navigation.moveTo(navigation.createPath(precise.x(), 100, precise.z(), 0), 1), "Unmarked native route absent");
            for (int frame = 0; frame < 180 && !navigation.isDone(); frame++) level.tickNonPassenger(body);
            require(body.getBoundingBox().getCenter().distanceTo(MinecraftCombat.vec(precise)) > close,
                "Unmarked large-body route did not expose the native final-node tolerance");
            navigation.stop(); body.moveTo(8.5, 100, 2.5); body.setOnGround(true); body.setDeltaMovement(Vec3.ZERO);
            require(combat.navigate(actor, precise, close, 1).equals("moving"), "Precise large-body route was refused");
            for (int frame = 0; frame < 180 && body.getBoundingBox().getCenter().distanceTo(MinecraftCombat.vec(precise)) > close; frame++) {
                if (frame % 5 == 0) combat.navigate(actor, precise, close, 1);
                level.tickNonPassenger(body);
            }
            require(body.getBoundingBox().getCenter().distanceTo(MinecraftCombat.vec(precise)) <= close
                && combat.navigate(actor, precise, close, 1).equals("arrived"), "Large body ended its native route outside the exact requested reach");
            var nodes = java.util.List.of(new net.minecraft.world.level.pathfinder.Node(3, 100, 2), new net.minecraft.world.level.pathfinder.Node(4, 100, 2));
            var first = new net.minecraft.world.level.pathfinder.Path(new java.util.ArrayList<>(nodes), new net.minecraft.core.BlockPos(4, 100, 2), true);
            require(NativePathGoal.moveTo(navigation, first, new Point(4.2, precise.y(), 2.5), .75, 1), "Initial sameAs fixture route was refused");
            var installed = navigation.getPath();
            var replacement = new net.minecraft.world.level.pathfinder.Path(new java.util.ArrayList<>(nodes), new net.minecraft.core.BlockPos(5, 100, 2), true);
            var changedGoal = new Point(4.6, precise.y(), 2.4);
            require(replacement != installed && replacement.sameAs(installed), "sameAs fixture did not retain equal node sequences");
            require(NativePathGoal.moveTo(navigation, replacement, changedGoal, .2, 1) && navigation.getPath() == installed,
                "Native moveTo did not retain the sameAs installed route");
            var retained = (NativePathGoal) installed;
            require(retained.worldcombat$goal().equals(changedGoal) && retained.worldcombat$within() == .2
                && installed.getEntityPosAtNode(body, installed.getNodeCount() - 1).equals(retained.worldcombat$feet(body)),
                "Retained sameAs route kept a stale goal/radius or hid the precise point from native arrival callbacks");
            var partial = new net.minecraft.world.level.pathfinder.Path(new java.util.ArrayList<>(nodes), new net.minecraft.core.BlockPos(6, 100, 2), false);
            require(NativePathGoal.moveTo(navigation, partial, new Point(6, precise.y(), 2), .2, 1)
                && ((NativePathGoal) navigation.getPath()).worldcombat$goal() == null, "A partial candidate inherited a previous exact-goal directive");
            mark("Native locomotion verified: body-local friction ownership, continuous path reach and actual large-body final-point arrival");
        } finally { combat.release(-920001, "checks:cleanup"); combat.release(-920002, "checks:cleanup"); combat.release(-920003, "checks:cleanup"); body.discard(); }
    }
    private static double drift(LivingEntity body) {
        body.moveTo(2, 100, 2); body.setOnGround(true); body.setDeltaMovement(.4, 0, 0);
        body.travel(Vec3.ZERO); return body.getDeltaMovement().x;
    }
}
