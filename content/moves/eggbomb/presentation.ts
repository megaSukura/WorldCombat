/** Native egg flight, brief landing cracks and one shell burst; the rolling body is rendered by its native appearance. */
const EggbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        heave: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 1.5, 0.15], height: 0.75, fit: "body",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_egg",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 }, spriteFrom: "age",
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.3, 0.12], sizeMode: "linear",
                    alpha: [0.85, 0], light: "world", maxParticles: 16
                },
                {
                    name: "tension", bind: "source", offset: [0, 0.2, 0.2], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.04, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.02],
                    color: 0xE8D8A8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        release: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "fling", bind: "source", offset: [0, 1.4, 0.35], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24, spin: 8,
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xF2E4B8, alpha: [0.8, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.35 }, rate: 22,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.03, drag: 0.94,
                    lifetime: [5, 11], size: [0.06, 0.02],
                    color: 0xE8D8A8, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wobble", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    trail: { minDistance: 0.5 }, rate: 10, spriteFrom: "age",
                    direction: "outward", speed: [0.0, 0.03], spin: 10,
                    lifetime: [4, 8], size: [0.07, 0.03],
                    color: 0xF6ECD2, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        shatter: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.32], spread: 22,
                    lifetime: [4, 9], size: [0.5, 0.1], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 12
                },
                {
                    // 一次薄环，半径就是本招算出的实际裂爆半径。
                    name: "ring", bind: "point", fit: "world", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 }, thickness: 0.1 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [8, 14], size: [0.34, 0.1],
                    color: 0xF2E4B8, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30, spin: 12,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [8, 15], size: [0.12, 0.04],
                    color: 0xF6ECD2, alpha: [0.95, 0], light: "world", maxParticles: 60
                },
                {
                    name: "yolk", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.09, drag: 0.9,
                    lifetime: [9, 17], size: [0.16, 0.05],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "world", maxParticles: 48
                }
            ]
        },
        splash: {
            // 落地先是一记轻磕：只有扬尘与一圈蛋径大小的薄环，蛋壳与蛋黄留到真爆。
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "knock", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "circle", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.05, drag: 0.9,
                    lifetime: [6, 12], size: [0.06, 0.015],
                    color: 0xD9CDA8, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "tap", bind: "point", fit: "world", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 0.4 }, thickness: 0.08 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0xE8D8A8, alpha: [0.5, 0], light: "world", maxParticles: 4
                }
            ]
        },
        roll: {
            // 滚动沿真实蛋位持续留下尘痕；蛋本身由原生外观渲染。
            duration: 0,
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "mark", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.07], gravity: 0.03, drag: 0.9,
                    lifetime: [5, 10], size: [0.05, 0.015],
                    color: 0xD9CDA8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_eggbomb", 1, EggbombDefinition);
