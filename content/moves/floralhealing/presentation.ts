/** 花疗的撒花、治疗绽放与落花表现；青草场地增加暖金强调层。 */
const FloralHealingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "petal_hand", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "petals", fallback: 18 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xE89AC0, alpha: [0.8, 0], light: "full", maxParticles: 50
                },
                {
                    name: "hand_glow", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xFFE3F0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        scatter: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "petal_line", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "petals", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "polyline", closed: false }, direction: "shape", speed: [0.02, 0.08], spin: 30,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0xE89AC0, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "petal_trail", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "petals", fallback: 18 }, interval: 2, repeats: 4 },
                    shape: { kind: "polyline", closed: false }, direction: "shape", speed: [0.03, 0.1], spin: 40,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: { data: "radius", fallback: 0.8 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: { data: "scale", fallback: 0.3 },
                    color: 0xE89AC0, alpha: [0.65, 0], light: "full", maxParticles: 16
                },
                {
                    name: "petal_burst", bind: "target", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "petals", fallback: 18 } }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.8 } },
                    direction: "outward", speed: [0.06, 0.2], spin: 40, drag: 0.9,
                    lifetime: [12, 24], size: [0.14, 0.03],
                    color: 0xE89AC0, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "flower_core", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.25 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 28], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 20
                },
                {
                    name: "heal_sparkle", bind: "target", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "healDust", fallback: 16 } }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFE3F0, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "grass_gild", bind: "target", offset: [0, 0.5, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "gold", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        residue: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "settle", bind: "target", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "flowers", fallback: 3 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 0.8 } }, direction: "down", speed: [0.01, 0.05], spin: 20, gravity: 0.01,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_floralhealing", 1, FloralHealingDefinition);
