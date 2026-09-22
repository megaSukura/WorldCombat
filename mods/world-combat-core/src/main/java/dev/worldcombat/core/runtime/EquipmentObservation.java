package dev.worldcombat.core.runtime;

/** Detached active equipment facts; cosmetic slots never supply gameplay equipment. */
public record EquipmentObservation(String provider, String slot, int index, String item, int count,
                                   String descriptionId, java.util.List<String> tags, ItemObservation stack) {
    public EquipmentObservation { tags = java.util.List.copyOf(tags); }
    public boolean tagged(String id) { return tags.contains(id); }
}
