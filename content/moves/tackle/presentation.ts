/** Body momentum: a short build-up, ground scuffs along the run, contact, then four beats of side-slip. */
const TackleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "duration", fallback: 4 }, exit: { stop: 0, drain: 4 },
            emitters: [{
                name: "plant", bind: "source", height: 0, offset: [0, 0.04, 0],
                particle: "world_combat_core:cobblemon/generic/earth",
                burst: { count: 5 }, shape: { kind: "ring", radius: 0.28 },
                direction: "inward", speed: [0.02, 0.05], lifetime: [3, 5], size: [0.1, 0.03],
                color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 8
            }]
        },
        run: {
            duration: 24, exit: { stop: 0, drain: 6 },
            emitters: [{
                name: "foot_scuffs", bind: "source", height: 0, offset: [0, 0.04, 0],
                particle: "world_combat_core:cobblemon/generic/earth",
                rate: 20, trail: { minDistance: 0.23 }, shape: { kind: "box", size: [0.28, 0.02, 0.28] },
                direction: "outward", speed: [0.02, 0.07], gravity: 0.045, drag: 0.9,
                lifetime: [5, 8], size: [0.1, 0.035], color: 0x8C7448, alpha: [0.65, 0], light: "world", maxParticles: 36
            }]
        },
        impact: {
            duration: 1, exit: { stop: 0, drain: 8 },
            emitters: [{
                name: "body_contact", bind: "point", fit: "world",
                particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                burst: { count: 4 }, shape: { kind: "sphere", radius: 0.16 },
                direction: "outward", speed: [0.03, 0.07], lifetime: [5, 8], size: [0.36, 0.07],
                color: 0xFFF2D8, alpha: [0.9, 0], light: "full", maxParticles: 8
            }]
        },
        slip: {
            duration: 6, exit: { stop: 0, drain: 7 },
            emitters: [{
                name: "side_scuff", bind: "source", height: 0, offset: [0, 0.035, 0],
                particle: "world_combat_core:cobblemon/generic/tinydust",
                rate: 20, trail: { minDistance: 0.08 }, shape: { kind: "box", size: [0.16, 0.02, 0.16] },
                direction: "outward", speed: [0.01, 0.04], drag: 0.9,
                lifetime: [5, 8], size: [0.1, 0.025], color: 0xBFA377, alpha: [0.65, 0], light: "world", maxParticles: 24
            }]
        },
        stop: {
            duration: 1, exit: { stop: 0, drain: 6 },
            emitters: [{
                name: "settling_foot", bind: "source", height: 0, offset: [0, 0.03, 0],
                particle: "world_combat_core:cobblemon/generic/earth",
                burst: { count: 3 }, shape: { kind: "ring", radius: 0.22 },
                direction: "outward", speed: [0.01, 0.04], gravity: 0.05,
                lifetime: [4, 6], size: [0.08, 0.02], color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 6
            }]
        },
        miss: {
            duration: 1, exit: { stop: 0, drain: 6 },
            emitters: [{
                name: "overrun_foot", bind: "source", height: 0, offset: [0, 0.03, 0],
                particle: "world_combat_core:cobblemon/generic/tinydust",
                burst: { count: 5 }, shape: { kind: "ring", radius: 0.3 },
                direction: "outward", speed: [0.02, 0.06], lifetime: [4, 6], size: [0.08, 0.02],
                color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 8
            }]
        }
    }
};
WorldCombatParticles.scene("world_combat:move_tackle", 1, TackleDefinition);
