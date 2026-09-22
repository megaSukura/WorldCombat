package dev.worldcombat.core.checks;

import dev.worldcombat.core.world.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.EntityType;
import java.nio.file.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Creates a previous content version through the public script API, for a real upgrade test. */
public final class SeedEffectChecks {
    private static int age;
    private static boolean done;
    public static void tick(MinecraftServer server) {
        if (done) return;
        try {
            age++; var service = CombatServices.get(server);
            if (age == 1) {
                var actor = mob(EntityType.PIG, prepare(server), 2);
                service.runtime().start("checks:remember_v1", service.bind(actor), service.bind(actor), null);
            }
            if (age == 12) {
                var values = service.runtime().effects().snapshot(); require(values.size() == 1, "Old state was not created");
                Files.writeString(Path.of("effect-before.json"), values.getFirst());
                done = true; System.out.println("P4CHECK PASS prior schema created through the public script interface");
            }
        } catch (Throwable error) { done = true; error.printStackTrace(); System.out.println("P4CHECK FAIL old effect seed " + error); }
    }
}
