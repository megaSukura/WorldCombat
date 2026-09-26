package dev.worldcombat.core.runtime;

/** A trace result; ActionContext only settles results issued to that instance. */
public record Impact(Point position, ActorHandle target, boolean blocked, String projectile, String entity, ActorHandle source, Point origin,
                     Point blockPosition, String blockFace, String projectilePath) {
    public Impact(Point position, ActorHandle target, boolean blocked, String projectile, String entity, ActorHandle source, Point origin,
                  Point blockPosition, String blockFace) {
        this(position, target, blocked, projectile, entity, source, origin, blockPosition, blockFace, "[]");
    }
    public Impact(Point position, ActorHandle target, boolean blocked, String projectile, String entity, ActorHandle source, Point origin) {
        this(position, target, blocked, projectile, entity, source, origin, null, "");
    }
    public Impact(Point position, ActorHandle target, boolean blocked, String projectile, String entity, ActorHandle source) { this(position, target, blocked, projectile, entity, source, position); }
    public Impact(Point position, ActorHandle target, boolean blocked) { this(position, target, blocked, "", "", null); }
    /** Living targets support action damage; other native entities still receive native impact callbacks. */
    public boolean hitEntity() { return target != null || !entity.isEmpty(); }
}
