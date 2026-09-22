package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import dev.worldcombat.core.runtime.effect.EffectRuntime;
import dev.worldcombat.core.runtime.effect.EffectData;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.animal.Pig;
import net.minecraft.world.entity.animal.Cow;
import java.nio.file.*;
import static dev.worldcombat.core.checks.TestWorld.*;

public final class EffectServerChecks {
    private static int age;
    private static boolean done, reloadDone;
    private static Pig actor;
    private static Cow target;
    private static long epoch;
    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            age++;
            var service = CombatServices.get(server);
            if (age == 1) {
                var level = prepare(server); actor = mob(EntityType.PIG, level, 2); target = mob(EntityType.COW, level, 4);
                require(!CombatServices.CONTENT.ids().contains("world_combat:training_bolt"), "Old sample package was installed");
                require(CombatServices.CONTENT.effects().packs().contains("world_combat:effect_examples"), "Selected content package absent");
                service.runtime().start("examples:protocol_hit", service.bind(actor), service.bind(target), null);
                require(Math.abs(target.getHealth() - (target.getMaxHealth() - 5)) < 0.01, "Script phase composition did not settle five damage");
                require(service.runtime().effects().stats().active() == 1, "Action completion effects: " + service.runtime().effects().stats()
                    + " target=" + java.util.Arrays.toString(service.runtime().effects().query(service.bind(target), ""))
                    + " saved=" + service.runtime().effects().snapshot());
                System.out.println("P4CHECK script-authored phases and once-only world damage passed");
            }
            if (age == 35) {
                require(service.runtime().effects().stats().active() == 0, "Actor effect did not expire");
                service.runtime().start("examples:remember", service.bind(actor), service.bind(actor), null);
            }
            if (age == 45) {
                var saved = service.runtime().effects().snapshot(); require(saved.size() == 1, "Persistent effect absent");
                var state = EffectData.GSON.fromJson(saved.getFirst(), EffectRuntime.Saved.class);
                require(state.schema() == 2 && state.data().contains("pulses"), "Script state schema missing");
                var runtime = service.runtime().effects();
                require(runtime.operate(state.id(), "world_combat:extend", service.bind(actor), null, "{\"ticks\":5}"), "Declared operation absent");
                var extended = EffectData.GSON.fromJson(runtime.snapshot().getFirst(), EffectRuntime.Saved.class);
                require(extended.remaining() == state.remaining() + 5, "Script extension rule did not run");
                long temporary = runtime.create("examples:memory", service.bind(actor), service.bind(actor), null, 0, "{\"pulses\":0}", 100);
                require(runtime.operate(temporary, "world_combat:dispel", service.bind(actor), null, "{}") && runtime.state(temporary) == null,
                    "Script dispel did not remove the selected instance");
                epoch = CombatServices.CONTENT.epoch();
                server.reloadResources(server.getPackRepository().getSelectedIds()).thenRun(() -> reloadDone = true);
            }
            if (age > 50 && reloadDone && CombatServices.CONTENT.epoch() > epoch && CombatServices.CONTENT.ready()
                && service.runtime().effects().stats().active() == 1) {
                require(service.runtime().effects().stats().timers() == 1 && service.runtime().effects().stats().listeners() == 1,
                    "Named timer/subscription failed to restore after reload");
                var saved = service.runtime().effects().snapshot();
                Files.writeString(Path.of("effect-before.json"), saved.getFirst());
                done = true; System.out.println("P4CHECK PASS scripted effects, phase order, lifetime and reload; persistent state prepared");
            }
        } catch (Throwable error) { done = true; error.printStackTrace(); System.out.println("P4CHECK FAIL effects tick=" + age + " " + error); }
    }
}
