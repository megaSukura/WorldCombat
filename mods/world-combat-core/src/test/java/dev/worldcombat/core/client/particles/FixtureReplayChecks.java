package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Replays an authored definition through the pure director path exactly as {@code /wcparticle}
 * builds its local entry, and reports what the point-bound moments spawn. Usage:
 * {@code -PparticleCheck=...FixtureReplayChecks --args="<definition.json> <moment> [ticks]"}.
 */
public final class FixtureReplayChecks {
    private FixtureReplayChecks() {}

    public static void main(String[] args) throws Exception {
        Path file = Path.of(args.length > 0 ? args[0] : "../../build/p2-particles-checks/particle_sample.json");
        String moment = args.length > 1 ? args[1] : "impact";
        int ticks = args.length > 2 ? Integer.parseInt(args[2]) : 60;
        var definition = DefinitionParser.parse("checks:particle_sample", 1, JsonParser.parseString(Files.readString(file)));
        JsonObject data = new JsonObject();
        data.addProperty("moment", moment);
        JsonObject entry = ParticleScriptApi.localEntry("checks:particle_sample", 1, -22.39, -60.0, 5.0, data.toString(), 0);
        List<String> failures = new ArrayList<>();
        var instance = new ParticleInstance(entry.get("key").getAsString(), definition, entry, (id, message) -> failures.add(id + ": " + message));
        var budget = new ParticleBudget();
        int[] spawns = new int[1];
        ParticleSink sink = (emitter, state) -> {
            spawns[0]++;
            if (spawns[0] <= 5) System.out.printf("spawn %s at (%.2f, %.2f, %.2f) v=(%.3f, %.3f, %.3f) life=%d size=%.3f%n",
                emitter.spec().name(), state.position.x, state.position.y, state.position.z,
                state.velocity.x, state.velocity.y, state.velocity.z, state.lifetime, state.size);
        };
        System.out.println("emitters: " + instance.emitters().size() + " failures: " + failures);
        for (int tick = 1; tick <= ticks; tick++) {
            instance.touch(entry, tick);
            instance.tick(tick, 1.0, budget, sink);
        }
        System.out.println("moment=" + moment + " ticks=" + ticks + " spawns=" + spawns[0]
            + " phase=" + instance.phase() + " live=" + instance.particleCount() + " failures=" + failures);
        if (spawns[0] == 0) throw new AssertionError("no spawns for moment " + moment);
        System.out.println("FixtureReplayChecks PASS");
    }
}
