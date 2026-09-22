package dev.worldcombat.core.runtime;

import com.google.gson.Gson;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Detached native stack facts and codec-encoded data components. */
public record ItemObservation(String id, int count, String descriptionId, int maxCount, int damage, int maxDamage,
                              List<String> tagIds, Set<String> componentIds, Map<String, String> componentValues, String serialized) {
    private static final Gson JSON = new Gson();
    public ItemObservation {
        tagIds = tagIds.stream().distinct().sorted().toList();
        componentIds = Set.copyOf(componentIds);
        componentValues = Map.copyOf(componentValues);
    }
    public boolean empty() { return count == 0; }
    public String tags() { return JSON.toJson(tagIds); }
    public boolean tagged(String tag) { return tagIds.contains(tag); }
    public String components() { return JSON.toJson(componentIds.stream().sorted().toList()); }
    public boolean hasComponent(String id) { return componentIds.contains(id); }
    public String component(String id) { return componentValues.get(id); }
}
