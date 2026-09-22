package dev.worldcombat.core.runtime;

/** Structured, immutable input. Direction is normalized; point remains a server-validated world coordinate. */
public record ActionTarget(String kind, ActorHandle entity, Point point, Point direction) {
    public ActionTarget {
        if (!java.util.Set.of("entity", "point", "direction").contains(kind) || point == null || direction == null)
            throw new IllegalArgumentException("Invalid action target");
        if (kind.equals("entity") != (entity != null)) throw new IllegalArgumentException("Target kind differs from value");
        if (!Double.isFinite(direction.length()) || direction.length() < 0.001) throw new IllegalArgumentException("Direction must be nonzero");
        direction = direction.unit();
    }

    public static ActionTarget entity(ActorHandle target, Point position, Point direction) {
        return new ActionTarget("entity", target, position, direction);
    }
    public static ActionTarget point(Point position, Point direction) {
        return new ActionTarget("point", null, position, direction);
    }
    public static ActionTarget direction(Point direction) {
        return new ActionTarget("direction", null, new Point(0, 0, 0), direction);
    }
}
