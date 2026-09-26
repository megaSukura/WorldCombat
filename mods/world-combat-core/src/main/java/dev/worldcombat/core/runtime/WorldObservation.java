package dev.worldcombat.core.runtime;

/** Detached values at one instant. Position is the native body centre; velocity is world-axis blocks per tick. */
public record WorldObservation(ActorHandle actor, Point position, double health, double maxHealth,
                               double movementSpeed, boolean visible, boolean friendly,
                               boolean hostile, boolean player, boolean wet, boolean grounded,
                               ActorHandle attacking, ActorHandle lastAttacker, int hurtAgo, String tags,
                               double width, double height, Point velocity, Point boundsMin, Point boundsMax) {
    /** Compatibility for hosts with symmetric body dimensions; Minecraft supplies its actual AABB instead. */
    public WorldObservation(ActorHandle actor, Point position, double health, double maxHealth,
                            double movementSpeed, boolean visible, boolean friendly, boolean hostile, boolean player,
                            boolean wet, boolean grounded, ActorHandle attacking, ActorHandle lastAttacker,
                            int hurtAgo, String tags, double width, double height, Point velocity) {
        this(actor, position, health, maxHealth, movementSpeed, visible, friendly, hostile, player, wet, grounded,
            attacking, lastAttacker, hurtAgo, tags, width, height, velocity,
            position.minus(new Point(width / 2, height / 2, width / 2)), position.plus(new Point(width / 2, height / 2, width / 2)));
    }
}
