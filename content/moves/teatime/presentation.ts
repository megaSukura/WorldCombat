/** 茶会的杯盘、热气与饮用反馈；cups 控制杯盘粒子数量。 */
const TeatimeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pour: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "kettle", bind: "source", offset: [0, 0.7, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8B45A, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "warm_froth", bind: "source", offset: [0, 0.65, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble_pop_broth",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xF0DDBF, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        serve: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "tea_ring", bind: "point", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: 4.0, thickness: 0.9 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [14, 24], size: [0.36, 0.14], sizeMode: "index",
                    color: 0xC98A4B, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "steam_rise", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "circle", radius: 4.0, thickness: 0.7 },
                    direction: "up", speed: [0.02, 0.1], spread: 12, drag: 0.95, spin: 4,
                    lifetime: [16, 30], size: [0.24, 0.6], sizeMode: "linear",
                    color: 0xF0DDBF, alpha: [0.22, 0], light: "world", maxParticles: 160
                },
                {
                    name: "note", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 4, shape: { kind: "circle", radius: 1.2 },
                    direction: "up", speed: [0.02, 0.07], drag: 0.95,
                    lifetime: [18, 30], size: [0.3, 0.05],
                    color: 0xE8B45A, alpha: [0.5, 0], light: "full", maxParticles: 20
                },
                {
                    name: "cups", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "cups", fallback: 6 } }, shape: { kind: "circle", radius: 1.1, thickness: 0.6 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xF0DDBF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        sip: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sip_steam", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [10, 20], size: [0.16, 0.05],
                    color: 0xF0DDBF, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "berry_glow", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8B45A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "taste", bind: "target", offset: [0, 0.55, 0.1], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble_pop_broth",
                    burst: { count: { data: "motes", fallback: 6 }, at: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.02,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x9CB86A, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        steep: {
            duration: 60,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "keep_warm", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "circle", radius: 4.0, thickness: 0.5 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.96, spin: 2,
                    lifetime: [24, 44], size: [0.3, 0.14],
                    color: 0xF0DDBF, alpha: [0.18, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ember", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 5, shape: { kind: "circle", radius: 1.0 },
                    direction: "up", speed: [0.01, 0.04], drag: 0.95,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xE8B45A, alpha: [0.3, 0], light: "full", maxParticles: 30
                }
            ]
        },
        empty: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "thin", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 }, shape: { kind: "circle", radius: 1.0 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.24, 0.08],
                    color: 0xF0DDBF, alpha: [0.2, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_teatime", 1, TeatimeDefinition);
