package dev.worldcombat.core.runtime;

import com.google.gson.Gson;
import java.util.List;

/** Detached membership in a data-pack registry at the time of observation. */
public record RegistryObservation(String registry, String id, List<String> tagIds) {
    private static final Gson JSON = new Gson();
    public RegistryObservation { tagIds = tagIds.stream().distinct().sorted().toList(); }
    public String tags() { return JSON.toJson(tagIds); }
    public boolean tagged(String tag) { return tagIds.contains(tag); }
}
