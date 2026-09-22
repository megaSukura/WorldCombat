package dev.worldcombat.core.runtime;

import java.util.Map;

/** Immutable native block facts; selection and interpretation belong to scripts. */
public record BlockObservation(Point position, String id, String state, Map<String, String> properties,
                               String tags, boolean growable) {
    public BlockObservation { properties = Map.copyOf(properties); }
    public String property(String name) { return properties.get(name); }
    /** Command-format block state, including every native property. */
    public String blockState() {
        return id + (properties.isEmpty() ? "" : "[" + properties.entrySet().stream().sorted(Map.Entry.comparingByKey())
            .map(entry -> entry.getKey() + "=" + entry.getValue()).collect(java.util.stream.Collectors.joining(",")) + "]");
    }
    public boolean tagged(String tag) {
        return com.google.gson.JsonParser.parseString(tags).getAsJsonArray().asList().stream()
            .anyMatch(value -> value.getAsString().equals(tag));
    }
}
