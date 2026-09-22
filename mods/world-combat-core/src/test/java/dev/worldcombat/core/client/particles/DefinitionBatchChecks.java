package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * Parses every scene definition in a directory and replays each moment through the pure director
 * path, the same way {@code /wcparticle} builds a local entry. Definitions come from a built client
 * profile via {@code node tools/extract-scenes.mjs}. Usage:
 * {@code -PparticleCheck=...DefinitionBatchChecks --args="<directory> [ticks]"}.
 * A parse failure or an emitter failure fails the run. Source- and target-bound emitters have no body
 * to follow in a local replay, so their skip notices and moments that spawn nothing are only reported.
 * Path-bound emitters receive a fixed triangle so polyline and polygon geometry is exercised.
 */
public final class DefinitionBatchChecks {
    private DefinitionBatchChecks() {}

    public static void main(String[] args) throws Exception {
        Path directory = Path.of(args.length > 0 ? args[0] : "../../build/p5-scenes");
        int ticks = args.length > 1 ? Integer.parseInt(args[1]) : 60;
        List<String> problems = new ArrayList<>();
        int scenes = 0, moments = 0, silent = 0;
        List<Path> files;
        try (Stream<Path> stream = Files.list(directory)) {
            files = stream.filter(p -> p.toString().endsWith(".json")).sorted().toList();
        }
        for (Path file : files) {
            String scene = file.getFileName().toString().replace(".json", "");
            ParticleDefinition definition;
            try {
                definition = DefinitionParser.parse("checks:" + scene, 1, JsonParser.parseString(Files.readString(file)));
            } catch (RuntimeException e) {
                problems.add(scene + ": " + e.getMessage());
                continue;
            }
            scenes++;
            for (String moment : definition.moments().keySet()) {
                moments++;
                JsonObject data = replayData(moment);
                JsonObject entry = ParticleScriptApi.localEntry("checks:" + scene, 1, -22.39, -60.0, 5.0, data.toString(), 0);
                List<String> failures = new ArrayList<>();
                var instance = new ParticleInstance(entry.get("key").getAsString(), definition, entry, (id, message) -> failures.add(id + ": " + message));
                var budget = new ParticleBudget();
                int[] spawns = new int[1];
                ParticleSink sink = (emitter, state) -> spawns[0]++;
                for (int tick = 1; tick <= ticks; tick++) {
                    instance.touch(entry, tick);
                    instance.tick(tick, 1.0, budget, sink);
                }
                // A local entry has no source, target or projectile body; emitters bound to them are skipped by design.
                failures.removeIf(message -> message.contains("missing SOURCE binding") || message.contains("missing TARGET binding")
                    || message.contains("missing PROJECTILE binding"));
                if (!failures.isEmpty()) problems.add(scene + "/" + moment + ": " + failures);
                if (spawns[0] == 0) silent++;
                System.out.printf("%s/%s emitters=%d spawns=%d phase=%s%n", scene, moment, instance.emitters().size(), spawns[0], instance.phase());
            }
        }
        System.out.println("scenes=" + scenes + " moments=" + moments + " silent(point-free)=" + silent + " problems=" + problems.size());
        for (String problem : problems) System.out.println("PROBLEM " + problem);
        if (!problems.isEmpty()) throw new AssertionError(problems.size() + " definition problem(s)");
        System.out.println("DefinitionBatchChecks PASS");
    }

    static JsonObject replayData(String moment) {
        JsonObject data = new JsonObject();
        data.addProperty("moment", moment);
        data.add("path", JsonParser.parseString("[[-22.39,-60,5],[-18.39,-60,5],[-22.39,-60,9]]"));
        return data;
    }
}
