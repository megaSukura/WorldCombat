package dev.worldcombat.core.runtime;

import java.util.*;
import com.google.gson.JsonParser;

/** Definition-owned compatibility. Reserved claims control host movement, aiming and sustained input. */
public record ActionComposition(boolean exclusive, Set<String> claims) {
    public static final ActionComposition EXCLUSIVE = new ActionComposition(true, Set.of("movement", "aim", "input"));
    public ActionComposition {
        var normalized = new LinkedHashSet<>(claims);
        // Native navigation turns the body as well as moving it.
        if (normalized.contains("movement")) normalized.add("aim");
        claims = Set.copyOf(normalized);
    }
    public boolean owns(String claim) { return exclusive || claims.contains(claim); }
    public boolean steers() { return owns("movement") || owns("aim"); }
    public boolean conflicts(ActionComposition other) {
        return exclusive || other.exclusive || claims.stream().anyMatch(other.claims::contains);
    }
    public static ActionComposition parse(String json) {
        var data = JsonParser.parseString(dev.worldcombat.core.runtime.effect.EffectData.copy(json)).getAsJsonObject();
        for (String key : data.keySet()) if (!Set.of("mode", "claims").contains(key)) throw new IllegalArgumentException("Unknown composition field: " + key);
        String mode = data.has("mode") ? data.get("mode").getAsString() : "exclusive";
        if (!Set.of("exclusive", "parallel").contains(mode)) throw new IllegalArgumentException("Invalid composition mode");
        var claims = new LinkedHashSet<String>();
        if (data.has("claims")) for (var value : data.getAsJsonArray("claims")) {
            String claim = value.getAsString();
            if (!Set.of("movement", "aim", "input").contains(claim)) dev.worldcombat.core.runtime.effect.EffectData.id(claim);
            if (!claims.add(claim)) throw new IllegalArgumentException("Duplicate action claim");
        }
        return new ActionComposition(mode.equals("exclusive"), claims);
    }
}
