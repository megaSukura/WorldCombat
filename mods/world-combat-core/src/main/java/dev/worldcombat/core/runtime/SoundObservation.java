package dev.worldcombat.core.runtime;

/** Audible facts contain a position and content payload, without granting a hidden actor handle. */
public record SoundObservation(long id, String sound, Point position, long tick, String data) {}
