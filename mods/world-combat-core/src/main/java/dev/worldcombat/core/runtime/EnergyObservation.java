package dev.worldcombat.core.runtime;

/** Snapshot of an actual NeoForge block energy capability; side identifies the face used for the observation. */
public record EnergyObservation(String side, int stored, int capacity, boolean receive, boolean extract) {}
