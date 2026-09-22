package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.animal.Pig;
import net.minecraft.world.entity.animal.Cow;
import static dev.worldcombat.core.checks.TestWorld.*;

public final class CoreServerChecks {
    private static int age;
    private static boolean done;
    private static Pig actor;
    private static Cow target;
    private static ServerLevel level;
    private static long reloadEpoch;
    private static volatile boolean reloadDone;
    private static final String ACTION = "world_combat:training_bolt";

    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            age++;
            var service = CombatServices.get(server);
            if (age == 1) {
                level = prepare(server);
                actor = mob(EntityType.PIG, level, 2);
                target = mob(EntityType.COW, level, 8);
                require(CombatServices.CONTENT.get(ACTION) != null, "Compiled core script missing");
                cast(server, ACTION);
            }
            if (age == 30) {
                require(Math.abs(target.getHealth() - (target.getMaxHealth() - 4F)) < 0.01, "Expected one scripted hit, health=" + target.getHealth());
                clean(service); mark("core scripted hit and scope cleanup");
            }
            if (age == 55) {
                target.setHealth(target.getMaxHealth()); target.invulnerableTime = 0;
                wall(level, true); cast(server, ACTION);
            }
            if (age == 85) {
                require(target.getHealth() == target.getMaxHealth(), "Projectile crossed a solid obstacle");
                clean(service); wall(level, false); mark("core obstacle collision");
            }
            if (age == 110) {
                cast(server, ACTION);
                service.runtime().cancelActor(service.bind(actor), "check-windup-cancel");
                require(service.runtime().cooldown(service.bind(actor), ACTION) == 0, "Windup cancellation spent cooldown");
            }
            if (age == 130) {
                require(target.getHealth() == target.getMaxHealth(), "Cancelled action still damaged target");
                clean(service); mark("core cancellation before commitment");
            }
            if (age == 150) { target.moveTo(14, 100, 2, 0, 0); cast(server, ACTION); }
            if (age == 158) {
                var handle = service.bind(actor);
                require(service.runtime().cooldown(handle, ACTION) > 0, "Committed action lacked cooldown");
                actor.discard(); clean(service);
            }
            if (age == 185) {
                require(target.getHealth() == target.getMaxHealth(), "Removed actor's projectile still settled");
                actor = mob(EntityType.PIG, level, 2);
                mark("core entity departure cleanup");
                // One failure keeps the move usable; the failure limit within the window disables it.
                for (int failure = 0; failure < dev.worldcombat.core.runtime.ContentRegistry.FAILURE_LIMIT; failure++) {
                    if (failure > 0) require(CombatServices.CONTENT.get("checks:throw") != null, "A single faulting cast disabled the content");
                    cast(server, "checks:throw");
                }
            }
            if (age == 190) {
                clean(service);
                require(CombatServices.CONTENT.get("checks:throw") == null, "Faulting content remained enabled");
                require(CombatServices.CONTENT.get(ACTION) != null, "Healthy content was disabled");
                mark("core script exception isolation");
            }
            if (age == 200) {
                cast(server, "checks:hold");
                require(service.runtime().stats().tasks() > 0 && service.runtime().stats().listeners() > 0, "Reload fixture absent");
                reloadEpoch = CombatServices.CONTENT.epoch();
                server.reloadResources(server.getPackRepository().getSelectedIds())
                    .thenRun(() -> reloadDone = true)
                    .exceptionally(error -> { mark("FAIL core reload " + error); done = true; return null; });
            }
            if (age > 205 && reloadDone && CombatServices.CONTENT.epoch() > reloadEpoch && CombatServices.CONTENT.ready()) {
                clean(service);
                require(CombatServices.CONTENT.get(ACTION) != null, "Content missing after reload");
                actor.discard(); target.discard(); done = true;
                mark("PASS core: scripted hit, collision, cancellation, departure, exception, reload");
            }
        } catch (Throwable error) {
            done = true; error.printStackTrace(); mark("FAIL core at tick " + age + ": " + error);
        }
    }
    private static void cast(MinecraftServer server, String action) throws com.mojang.brigadier.exceptions.CommandSyntaxException {
        int result = server.getCommands().getDispatcher().execute("worldcombat cast " + action + " " + actor.getUUID() + " " + target.getUUID(), server.createCommandSourceStack());
        require(result == 1, "Action rejected: " + action);
    }
}
