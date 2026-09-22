/** 破壳的裂纹、碎片飞散与收势表现；数量和大小由个体参数决定。 */
const ShellSmashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swell: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "seam", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xFFF6E0, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "shock_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        shed: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "plates", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "outward", speed: [0.06, { data: "shatter", fallback: 0.15 }],
                    gravity: 0.05, lifetime: [18, 30], size: [{ data: "shardSize", fallback: 0.1 }, 0.02], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0x8A8374, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 5, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [6, 12], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 1.8 } },
                    direction: "up", speed: [0.01, 0.05],
                    gravity: 0.03, lifetime: [14, 24], size: [0.12, 0.03],
                    color: 0x8A8374, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shellsmash", 1, ShellSmashDefinition);
