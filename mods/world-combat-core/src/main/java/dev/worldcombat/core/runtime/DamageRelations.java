package dev.worldcombat.core.runtime;

/** Explicit relationship exceptions for one native hurt call; never part of damage metadata. */
public record DamageRelations(boolean self, boolean friendly) {
    public static final DamageRelations HOSTILE = new DamageRelations(false, false);

    public static DamageRelations parse(String json) {
        if (json == null || json.length() > 256) throw new IllegalArgumentException("Invalid damage relations");
        var value = com.google.gson.JsonParser.parseString(json).getAsJsonObject();
        for (var entry : value.entrySet()) {
            if (!entry.getKey().equals("self") && !entry.getKey().equals("friendly")
                || !entry.getValue().isJsonPrimitive() || !entry.getValue().getAsJsonPrimitive().isBoolean())
                throw new IllegalArgumentException("Damage relations accept only self/friendly booleans");
        }
        return new DamageRelations(value.has("self") && value.get("self").getAsBoolean(),
            value.has("friendly") && value.get("friendly").getAsBoolean());
    }
}
