package dev.worldcombat.core.client.particles;

import com.google.gson.JsonParser;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;

/** Validates production scene bindings with the fractional payloads that caused real client failures, without rendering. */
public final class DefinitionPayloadChecks {
    public static void main(String[] args) throws Exception {
        var failures = new ArrayList<String>();
        int count = 0;
        try (var files = Files.list(Path.of(args[0]))) {
            for (var file : files.filter(path -> path.toString().endsWith(".json")).sorted().toList()) {
                var definition = DefinitionParser.parse("checks:" + file.getFileName().toString().replace(".json", ""), 1,
                    JsonParser.parseString(Files.readString(file)));
                for (var payload : new String[]{"{}", "{\"intensity\":0.7,\"force\":2.37,\"stride\":4.16}",
                    "{\"intensity\":1.25,\"force\":1.45,\"stride\":6.2}"}) {
                    try { definition.resolve(JsonParser.parseString(payload).getAsJsonObject()); }
                    catch (RuntimeException error) { failures.add(file.getFileName() + " " + payload + " " + error.getMessage()); }
                }
                count++;
            }
        }
        failures.forEach(System.err::println);
        if (!failures.isEmpty()) throw new AssertionError(failures.size() + " production payload failures");
        if (count == 0) throw new AssertionError("No production scenes found");
        System.out.println("PASS " + count + " production scenes: default and fractional payloads");
    }
}
