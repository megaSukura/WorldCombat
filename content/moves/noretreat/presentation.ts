/** The standing ring is the fixed movement boundary; the burst counts the granted stat choices. */
const NoretreatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_dust", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0xE0B040, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather_glint", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 13], size: [0.08, 0.01],
                    color: 0xFFF2C8, alpha: [0.55, 0], light: "full", maxParticles: 18
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 1 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [12, 20], size: [0.5, 1.1], sizeMode: "linear",
                    color: 0xE0B040, alpha: [0.85, 0], light: "world", maxParticles: 10
                },
                {
                    name: "burst_surge", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "surge", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: 1.6, thickness: 0.7 },
                    direction: "up", speed: [0.12, 0.34], spread: 12, gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xF0D060, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "burst_core", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: { data: "boosts", fallback: 5 }, repeats: 4, interval: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    lifetime: [10, 18], size: [0.24, 0.04], sizeMode: "linear",
                    color: 0xFFF2C8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        stand: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "stand_ring", bind: "point", offset: [0, 0.05, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "circle", radius: { data: "ring", fallback: 2.4 }, thickness: 0.92 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 36], size: [0.34, 0.1], sizeMode: "sin",
                    color: 0xE0B040, alpha: [0.35, 0.05], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "stand_dust", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 2, shape: { kind: "circle", radius: { data: "ring", fallback: 2.4 }, thickness: 0.85 },
                    direction: "up", speed: [0.005, 0.02], gravity: 0.01, drag: 0.94,
                    lifetime: [20, 30], size: [0.12, 0.03],
                    color: 0xF0D060, alpha: [0.2, 0.02], alphaMode: "sin", light: "world", maxParticles: 10
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "release_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [14, 22], size: [0.5, 0.8], sizeMode: "linear",
                    color: 0xE0B040, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "release_dust", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "surge", fallback: 12 }, at: 1 },
                    shape: { kind: "circle", radius: 1.6, thickness: 0.9 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF0D060, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_noretreat", 1, NoretreatDefinition);
