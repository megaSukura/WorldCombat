package dev.worldcombat.core.runtime;

import java.util.Set;
import java.util.function.Consumer;

public record ActionDefinition(String id, String version, int maxTicks, Consumer<ActionContext> start,
                               String actorDomain, String targetKind, double range, ActionComposition composition) {
    public ActionDefinition(String id, String version, int maxTicks, Consumer<ActionContext> start, String actorDomain, String targetKind, double range) {
        this(id, version, maxTicks, start, actorDomain, targetKind, range, ActionComposition.EXCLUSIVE);
    }
    public ActionDefinition(String id, String version, int maxTicks, Consumer<ActionContext> start, String actorDomain) {
        this(id, version, maxTicks, start, actorDomain, "enemy", 32);
    }
    public ActionDefinition {
        if (composition == null) throw new IllegalArgumentException("Action needs a composition policy");
        if (id == null || !id.matches("[a-z0-9_.-]+:[a-z0-9_./-]+"))
            throw new IllegalArgumentException("Action needs a namespaced id");
        if (version == null || version.isBlank() || version.length() > 64)
            throw new IllegalArgumentException("Action needs a short version");
        if (actorDomain == null || !actorDomain.matches("[a-z0-9_.-]+|\\*"))
            throw new IllegalArgumentException("Invalid actor domain");
        if (maxTicks < 1 || maxTicks > 1200 || start == null)
            throw new IllegalArgumentException("Action duration must be 1..1200 ticks and needs a handler");
        if (!Set.of("enemy", "friend", "aim", "point", "motion", "self").contains(targetKind)
            || !Double.isFinite(range) || range < 0 || range == 0 && !targetKind.equals("self") || range > 32)
            throw new IllegalArgumentException("Invalid action geometry");
    }
}
