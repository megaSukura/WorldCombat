package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.world.MinecraftCombat;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.living.LivingChangeTargetEvent;
import java.util.function.Consumer;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Native event acceptance and same-target ownership; run with the ordinary hidden native checks. */
public final class NativeTargetRequestChecks {
    private static String mode = "";
    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.ZOMBIE, level, 2); var old = mob(EntityType.COW, level, 5);
        var next = mob(EntityType.COW, level, 8); var wolf = mob(EntityType.WOLF, level, 11);
        var actor = combat.bind(body); var before = combat.bind(old); var desired = combat.bind(next); var neutral = combat.bind(wolf);
        Consumer<LivingChangeTargetEvent> policy = event -> {
            if (event.getEntity() != body && event.getEntity() != wolf) return;
            if (mode.equals("cancel")) event.setCanceled(true);
            if (mode.equals("rewrite")) event.setNewAboutToBeSetTarget(old);
        };
        NeoForge.EVENT_BUS.addListener(policy);
        try {
            body.setTarget(old); mode = "cancel";
            require(!combat.targetLease(9101, actor, null, 20) && body.getTarget() == old, "Canceled native calm acquired ownership");
            mode = ""; body.setTarget(null); mode = "cancel";
            require(!combat.targetLease(9101, actor, null, 20), "Canceled null-to-null was mistaken for acceptance");
            mode = ""; body.setTarget(old);
            require(combat.targetLease(9101, actor, null, 20), "Native calm failed to acquire");
            for (int i = 0; i < 5; i++) body.setTarget(next);
            require(body.getTarget() == null && active(combat, 9101, actor), "Native target selection escaped calm between pulses");
            combat.targetLeaseRelease(9101, actor);
            require(body.getTarget() == old, "Calm did not restore its valid prior target");
            require(combat.targetLease(9102, actor, desired, 30), "Native redirect failed");
            body.setTarget(next);
            require(!active(combat, 9102, actor) && !combat.targetLease(9102, actor, desired, 30), "Same-target native request did not take ownership");
            combat.targetRequests().release(9102);
            require(body.getTarget() == next, "Ending former owner rolled back external target");
            require(combat.targetLease(9103, actor, null, 30), "Second calm failed");
            mode = "rewrite"; body.setTarget(next); mode = "";
            require(body.getTarget() == old && !active(combat, 9103, actor), "Native event rewrite did not release calm");
            require(combat.targetLease(9104, actor, desired, 30), "Restoration fixture failed");
            mode = "cancel"; combat.targetLeaseRelease(9104, actor); mode = "";
            require(body.getTarget() == next && !active(combat, 9104, actor), "Restoration bypassed native refusal");
            wolf.setTarget(old); wolf.setPersistentAngerTarget(old.getUUID()); wolf.setRemainingPersistentAngerTime(200);
            mode = "cancel";
            require(!combat.target(neutral, null) && wolf.getTarget() == old && old.getUUID().equals(wolf.getPersistentAngerTarget())
                && wolf.getRemainingPersistentAngerTime() == 200, "Rejected clear mutated neutral anger");
            mode = "";
            require(combat.targetLease(9105, neutral, null, 20) && old.getUUID().equals(wolf.getPersistentAngerTarget())
                && wolf.getRemainingPersistentAngerTime() == 200, "Temporary lease rewrote lasting neutral anger");
            combat.targetRequests().release(9105);
            require(wolf.getTarget() == old, "Neutral lease failed to restore target");
            mark("Native target leases verified: event refusal, repeated selection, ownership handoff, restore refusal and neutral anger");
        } finally {
            mode = ""; NeoForge.EVENT_BUS.unregister(policy);
            for (long id = 9101; id <= 9105; id++) combat.targetRequests().release(id);
            body.discard(); old.discard(); next.discard(); wolf.discard();
        }
    }
    private static boolean active(MinecraftCombat combat, long owner, dev.worldcombat.core.runtime.ActorHandle actor) {
        var state = JsonParser.parseString(combat.targetLeaseState(owner, actor)).getAsJsonObject();
        return state.get("active").getAsBoolean() && state.get("owned").getAsBoolean();
    }
}
