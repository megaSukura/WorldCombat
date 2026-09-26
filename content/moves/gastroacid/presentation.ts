/** 胃液的酸弹尾迹、目标腐蚀与落点溅射表现。 */
const GastroacidSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "throat_bubbles", bind: "source", fit: "body", offset: [0, 0.75, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "bubbles", fallback: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.1], spin: 20,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x9BE049, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "acid_well", bind: "source", fit: "body", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 6, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.05],
                    color: 0x3A4A22, alpha: [0.7, 0.2], light: "world", maxParticles: 30
                }
            ]
        },
        spit: {
            emitters: [
                {
                    name: "glob", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    trail: { minDistance: 0.26 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 11], size: [0.2, 0.12],
                    color: 0x9BE049, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "drip", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.16 }, rate: { data: "drops", fallback: 16 },
                    direction: "velocity", speed: [0.0, 0.05], spread: 26,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xE8FF9B, alpha: [0.75, 0], light: "full", maxParticles: 140
                }
            ]
        },
        splash: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "acid_burst", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.38], spread: 26,
                    gravity: 0.035, drag: 0.9,
                    lifetime: [8, 16], size: [0.17, 0.03], sizeMode: "index",
                    color: 0x9BE049, alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "sludge", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    gravity: 0.04, drag: 0.88,
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0x3A4A22, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "vapor", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], spread: 28,
                    gravity: 0.005, drag: 0.87,
                    lifetime: [14, 24], size: [0.26, 0.06],
                    color: 0x6E8A3A, alpha: [0.35, 0], light: "world", render: "translucent", maxParticles: 70
                },
                {
                    name: "splash_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xE8FF9B, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        },
        corrode: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "corrode_cling", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: { data: "drops", fallback: 12 }, interval: 3, repeats: 3 },
                    shape: { kind: "box", size: [0.8, 1.3, 0.8] },
                    direction: "down", speed: [0.0, 0.06], drag: 0.93,
                    lifetime: [12, 22], size: [0.18, 0.05],
                    color: 0x3A4A22, alpha: [0.85, 0.1], light: "world", maxParticles: 120
                },
                {
                    name: "corrode_bubbles", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "bubbles", fallback: 6 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.07], spin: 25,
                    lifetime: [12, 22], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8FF9B, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "corrode_seal", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.32, 0.8], sizeMode: "sin",
                    color: 0x9BE049, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        coat: { emitters: [
            { name: "film", bind: "target", fit: "body", height: .5, particle: "world_combat_core:cobblemon/generic/goo/ooze",
                rate: 3, shape: { kind: "sphere_surface", radius: .4 }, direction: "down", speed: .015,
                lifetime: 10, size: [.12, .06], color: 0x9BE049, alpha: [.25, 0], light: "world" }
        ] },
        sting: { duration: 12, emitters: [
            { name: "acid_tick", bind: "target", fit: "body", height: .5, particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                burst: { count: 3 }, shape: { kind: "sphere_surface", radius: .4 }, direction: "down", speed: .06,
                lifetime: 8, size: [.1, .02], color: 0xE8FF9B, alpha: [.8, 0], light: "world" }
        ] },
        settle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "settle_dust", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.02, drag: 0.93,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xE8FF9B, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gastroacid", 1, GastroacidSceneDefinition);
