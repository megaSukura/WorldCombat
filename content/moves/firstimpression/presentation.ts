const FirstimpressionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        opening: {
            duration: 1200000, exit: { stop: 0, drain: 6 },
            emitters: [{ name: "entry_cue", bind: "source", height: 0.55,
                particle: "world_combat_core:cobblemon/generic/ring/mediumring", rate: 2,
                shape: { kind: "ring", radius: 0.24, rotation: [90, 0, 0] },
                speed: 0, lifetime: 10, size: [0.13, 0.07], alpha: [0.5, 0], color: 0x9BC24B,
                light: "world", maxParticles: 3 }]
        },
        coil: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "coil_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 10, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0x9BC24B, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "coil_seed", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xC9E07A, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        dive: {
            duration: 40,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "start_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 16], size: [0.11, 0.03], sizeMode: "index",
                    color: 0x6F7A3A, alpha: [0.6, 0], light: "world", maxParticles: 110
                },
                {
                    name: "dive_trail", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 30, trail: { minDistance: 0.32 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [6, 13], size: [0.08, 0.02],
                    color: 0x9BC24B, alpha: [0.6, 0], light: "world", maxParticles: 150
                },
                {
                    name: "speed", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.32, 0.3] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [3, 7], size: [0.16, 0.05],
                    color: 0xC9E07A, alpha: [0.4, 0], light: "full", maxParticles: 130
                }
            ]
        },
        crash: {
            duration: 30,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "bug_impact", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "count", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.07, 0.28],
                    lifetime: [5, 10], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEAF6C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "shell_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "count", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.26],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 17], size: [0.1, 0.03],
                    color: 0x6F9A2E, alpha: [0.75, 0], light: "world", maxParticles: 130
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [9, 16], size: [0.3, 0.07],
                    color: 0xB8C98A, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        whiff: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0x9AA06A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.03], sizeMode: "index",
                    color: 0x6F7A3A, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firstimpression", 1, FirstimpressionDefinition);
