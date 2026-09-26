/** Prayer opening, actual revival pulse, and an optional beacon at the matching recorded death site. */
const RevivalBlessingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kneel: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 18], size: [0.10, 0.02],
                    color: 0xFFE98A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        beacon: {
            duration: { data: "duration", fallback: 160 },
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    burst: { count: { data: "beams", fallback: 6 } },
                    shape: { kind: "cylinder", radius: 0.22, length: 3.2 }, direction: "up", speed: [0.0, 0.04],
                    lifetime: [20, 30], size: [0.3, 0.9], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "rise", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 24 },
                    shape: { kind: "circle", radius: 0.6 }, direction: "up", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xFFE98A, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.04, 0.08],
                    lifetime: [22, 32], size: [1.8, 0.5], sizeMode: "index",
                    color: 0xB69A4A, alpha: [0.5, 0], light: "world", maxParticles: 32
                }
            ]
        },
        anoint: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "bless", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], drag: 0.92,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0xFFE98A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 48
                }
            ]
        },
        pray: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fold", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.1],
                    lifetime: [24, 34], size: [2.0, 0.5], sizeMode: "index",
                    color: 0xFFE98A, alpha: [0.5, 0], light: "full", maxParticles: 32
                }
            ]
        },
        none: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hollow", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.12, 0.04],
                    color: 0xB69A4A, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_revivalblessing", 1, RevivalBlessingDefinition);
