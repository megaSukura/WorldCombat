/** A small medium cue precedes the called move's own complete presentation. */
function naturepowerGather(particle: string, color: number): ParticleMoment {
    return { duration: 22, exit: { stop: 0, drain: 8 }, emitters: [{
        name: "medium", bind: "point", fit: "none", height: 0, offset: [0, .08, 0], particle: particle,
        rate: 14, shape: { kind: "ring", radius: .65 }, direction: "inward", speed: [.02, .06],
        lifetime: [6, 12], size: [.13, .03], color: color, alpha: [.8, 0], light: "world", maxParticles: 24
    }] };
}
WorldCombatParticles.scene("world_combat:move_naturepower", 1, { interrupt: "drain", moments: {
    verdant: naturepowerGather("world_combat_core:cobblemon/generic/grass/leaf", 0x8FCF6E),
    water: naturepowerGather("world_combat_core:cobblemon/generic/water/rainsplash", 0x7FD7F0),
    ember: naturepowerGather("world_combat_core:cobblemon/generic/fire/ember", 0xFF9A3C),
    earth: naturepowerGather("world_combat_core:cobblemon/generic/large_rock", 0xC9C6BE),
    plain: naturepowerGather("world_combat_core:cobblemon/generic/sparkle/mediumsparkle", 0xE8E4D8)
} });
