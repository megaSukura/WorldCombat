package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.Point;
import dev.worldcombat.core.runtime.WorldAccess;
import dev.worldcombat.core.world.MinecraftCombat;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Received movement semantics, independent of any authored move. */
public final class NativeHitMotionChecks {
    private static UUID subject;
    private static String mode = "";
    private static int events;
    private static int scriptEvents;
    private static boolean listening;
    public static void onMotion(dev.worldcombat.core.runtime.WorldEvent event) {
        if (subject == null || !event.actor().entity().equals(subject)) return;
        scriptEvents++;
        var data = com.google.gson.JsonParser.parseString(event.data()).getAsJsonObject();
        if (mode.equals("script-half") || mode.equals("both")) {
            data.addProperty("strength", data.get("strength").getAsDouble() / 2); event.data(data.toString());
        }
        if (mode.equals("script-cancel")) event.reject("fixture-movement-refused");
    }
    public static void run(MinecraftCombat combat, ServerLevel level) {
        if (!listening) {
            listening = true;
            NeoForge.EVENT_BUS.addListener((LivingKnockBackEvent event) -> {
                if (subject == null || !subject.equals(event.getEntity().getUUID())) return;
                events++;
                if (mode.equals("cancel")) event.setCanceled(true);
                if (mode.equals("half") || mode.equals("both")) event.setStrength(event.getStrength() / 2);
                if (mode.equals("turn")) { event.setRatioX(0); event.setRatioZ(-1); }
            });
        }
        var source = mob(EntityType.COW, level, 2); var target = mob(EntityType.COW, level, 6);
        var actor = combat.bind(source); var victim = combat.bind(target);
        var wall = new BlockPos(7, 100, 2);
        subject = target.getUUID(); events = 0; scriptEvents = 0;
        try {
            target.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(0);
            target.setOnGround(true); target.setDeltaMovement(.2, .1, .3);
            require(combat.knockback(actor, victim, null, .4, new Point(1, 0, 0)), "Native knockback had no received motion");
            near(target.getDeltaMovement(), new Vec3(.5, .4, .15), "Vanilla damping/lift was replaced by raw motion");
            require(events == 1, "Native knockback posted the event more than once");

            target.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(.5);
            target.setDeltaMovement(.1, .2, .3); mode = "";
            require(combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0)), "Partial resistance blocked the entire impulse");
            near(target.getDeltaMovement(), new Vec3(.4, .6, .3), "3D resistance was not applied once to all axes");
            target.setDeltaMovement(Vec3.ZERO); mode = "half";
            combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0));
            near(target.getDeltaMovement(), new Vec3(.15, .2, 0), "Native strength edit did not scale the entire impulse");
            target.setDeltaMovement(Vec3.ZERO); mode = "turn";
            combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0));
            near(target.getDeltaMovement(), new Vec3(0, .4, .3), "Native heading edit changed pitch or ignored heading");
            target.setDeltaMovement(Vec3.ZERO);
            combat.hitImpulse(actor, victim, null, new Point(0, -.8, 0));
            near(target.getDeltaMovement(), new Vec3(0, -.4, 0), "Vertical impulse gained a fabricated horizontal direction");

            target.setDeltaMovement(Vec3.ZERO); mode = "script-half";
            combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0));
            near(target.getDeltaMovement(), new Vec3(.15, .2, 0), "Content strength did not compose once with native resistance");
            target.setDeltaMovement(Vec3.ZERO); mode = "both";
            combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0));
            near(target.getDeltaMovement(), new Vec3(.075, .1, 0), "Content overwrote an earlier Mod strength contribution");
            target.setDeltaMovement(Vec3.ZERO); mode = "script-half";
            combat.hitImpulse(actor, victim, null, new Point(0, -.8, 0));
            near(target.getDeltaMovement(), new Vec3(0, -.2, 0), "Content strength failed on purely vertical received movement");
            target.setDeltaMovement(Vec3.ZERO); mode = "script-cancel";
            require(!combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0)), "Content refusal did not cancel received movement");
            int beforeScript = scriptEvents;

            mode = "cancel"; var before = target.getDeltaMovement(); var position = target.position();
            require(!combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0))
                && !combat.knockback(actor, victim, null, .4, new Point(1, 0, 0))
                && combat.hitDisplace(actor, victim, null, new Point(1, 0, 0)) == 0, "Cancelled native received movement was applied");
            near(target.getDeltaMovement(), before, "Cancellation modified velocity");
            near(target.position(), position, "Cancellation modified position");
            require(scriptEvents == beforeScript, "A refused native event still entered content policies");
            mode = ""; target.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(1);
            require(!combat.hitImpulse(actor, victim, null, new Point(.6, .8, 0))
                && combat.hitDisplace(actor, victim, null, new Point(1, 0, 0)) == 0, "Full resistance did not refuse received movement");

            target.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(.5); target.setDeltaMovement(Vec3.ZERO);
            for (int y = 0; y < 3; y++) level.setBlockAndUpdate(wall.above(y), Blocks.STONE.defaultBlockState());
            double moved = combat.hitDisplace(actor, victim, null, new Point(2, 0, 0));
            require(moved > 0 && moved < 1 && target.getBoundingBox().maxX <= 7 + 1e-6, "Received displacement ignored native wall collision or its block budget");
            near(target.getDeltaMovement(), Vec3.ZERO, "Received displacement became velocity");

            require(!combat.hitImpulse(actor, actor, null, new Point(0, 1, 0)), "Hostile impulse was used as self locomotion");
            target.setInvulnerable(true);
            require(!combat.hitImpulse(actor, victim, null, new Point(0, 1, 0)), "Received movement bypassed harm permissions");
            target.setInvulnerable(false);
            require(target.startRiding(source, true), "Mounted fixture failed");
            require(!combat.hitImpulse(actor, victim, null, new Point(0, 1, 0))
                && combat.hitDisplace(actor, victim, null, new Point(1, 0, 0)) == 0, "Received movement bypassed mounted boundary");
            target.stopRiding();
            var world = new WorldAccess(combat.runtime(), actor, null, () -> {}, true, 0);
            require(world.hurt(victim, 1000, "{}") && !target.isAlive(), "Received movement fixture did not deal lethal native damage");
            before = target.getDeltaMovement(); position = target.position(); int beforeEvents = events;
            require(!world.hitImpulse(victim, new Point(.6, .8, 0))
                && !world.knockback(victim, .4, new Point(1, 0, 0))
                && world.hitDisplace(victim, new Point(1, 0, 0)) == 0, "Lethal follow-up did not return a normal no-movement receipt");
            near(target.getDeltaMovement(), before, "Lethal follow-up changed corpse velocity");
            near(target.position(), position, "Lethal follow-up displaced the corpse");
            require(events == beforeEvents, "Lethal follow-up posted another received-movement event");
            target.discard();
            require(!world.hitImpulse(victim, new Point(.6, .8, 0))
                && world.hitDisplace(victim, new Point(1, 0, 0)) == 0, "Departed recipient was not a normal refusal");
            mark("Received motion verified: vanilla knockback, event edits/cancellation, 3D resistance, wall displacement, permissions, mounted boundary and lethal follow-up");
        } finally {
            mode = ""; subject = null;
            for (int y = 0; y < 3; y++) level.setBlockAndUpdate(wall.above(y), Blocks.AIR.defaultBlockState());
            source.discard(); target.discard();
        }
    }
    private static void near(Vec3 actual, Vec3 expected, String message) { require(actual.distanceToSqr(expected) < 1e-12, message); }
}
