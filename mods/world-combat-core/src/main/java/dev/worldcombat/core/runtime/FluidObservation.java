package dev.worldcombat.core.runtime;

import java.util.Map;

/** Native fluid state at a loaded position, including contained fluids. */
public record FluidObservation(Point position, RegistryObservation type, boolean empty, boolean source, int amount,
                               double height, Point flow, Map<String, String> properties) {
    public FluidObservation { properties = Map.copyOf(properties); }
    public String id() { return type.id(); }
    public String tags() { return type.tags(); }
    public boolean tagged(String tag) { return type.tagged(tag); }
    public String property(String name) { return properties.get(name); }
}
