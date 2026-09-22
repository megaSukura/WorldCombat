package dev.worldcombat.core.runtime;

/** Detached values at one instant. Position is the native body centre; velocity is world-axis blocks per tick. */
public record WorldObservation(ActorHandle actor, Point position, double health, double maxHealth,
                               double movementSpeed, boolean visible, boolean friendly,
                               boolean hostile, boolean player, boolean wet, boolean grounded,
                               ActorHandle attacking, ActorHandle lastAttacker, int hurtAgo, String tags,
                               double width, double height, Point velocity) {}
