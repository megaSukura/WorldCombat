package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import dev.worldcombat.core.runtime.effect.*;
import net.minecraft.server.MinecraftServer;
import java.nio.file.*;
import static dev.worldcombat.core.checks.TestWorld.require;

public final class SavedEffectChecks {
    private static int age;
    private static boolean done;
    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            age++;
            var service = CombatServices.get(server);
            if (age < 40) return;
            var before = EffectData.GSON.fromJson(Files.readString(Path.of("effect-before.json")), EffectRuntime.Saved.class);
            require(service.findActor(before.source().domain(), before.source().identity()) != null, "Saved actor not restored");
            if (!CombatServices.CONTENT.effects().contains("examples:memory")) {
                require(service.runtime().effects().snapshot().isEmpty() && service.runtime().effects().stats().active() == 0, "Removed package retained custom state");
                done = true; System.out.println("P4CHECK PASS package removal cleared its effects while the native entity survived"); return;
            }
            var restored = service.runtime().effects().snapshot(); require(restored.size() == 1, "Saved effect did not restore once");
            var after = EffectData.GSON.fromJson(restored.getFirst(), EffectRuntime.Saved.class);
            double oldCount = com.google.gson.JsonParser.parseString(before.data()).getAsJsonObject().get(before.schema() == 1 ? "count" : "pulses").getAsDouble();
            double newCount = com.google.gson.JsonParser.parseString(after.data()).getAsJsonObject().get("pulses").getAsDouble();
            require(after.id() == before.id() && after.schema() == 2 && newCount > oldCount, "Migration or named timer continuity failed");
            require(after.remaining() < before.remaining() && after.remaining() > before.remaining() - 300, "Offline time consumed the effect");
            require(service.runtime().effects().stats().listeners() == 1 && service.runtime().effects().stats().timers() == 1, "Restored subscriptions duplicated");
            done = true; System.out.println("P4CHECK PASS real restart schema=" + before.schema() + "->2, persistent identity, timer and listener continuity");
        } catch (Throwable error) { done = true; error.printStackTrace(); System.out.println("P4CHECK FAIL saved effects " + error); }
    }
}
