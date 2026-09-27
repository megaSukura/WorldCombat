/** 破壳的裂纹、壳片飞散与收势表现；数量和大小由个体参数决定，壳片从体表飞出、按 spread 的行程落地。 */
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
            duration: 0,
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0, 0], height: 0.35, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "bodyR", fallback: 0.45 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "shock_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.1, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        shed: {
            duration: 0,
            emitters: [
                {
                    name: "plates", bind: "source", offset: [0, 0, 0], height: 0.25, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "bodyR", fallback: 0.45 } },
                    direction: "outward", speed: [{ data: "shatter", fallback: 0.15 }, { data: "shatter", fallback: 0.15 }],
                    gravity: 0.05, lifetime: [{ data: "flight", fallback: 22 }, { data: "flight", fallback: 22 }],
                    size: [{ data: "shardSize", fallback: 0.1 }, 0.02], sizeMode: "index",
                    color: 0xE8E2D0, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0, 0], height: 0.15, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: { data: "bodyR", fallback: 0.45 } },
                    direction: "outward", speed: [0.04, { data: "shatter", fallback: 0.15 }],
                    gravity: 0.04, lifetime: [{ data: "flight", fallback: 22 }, { data: "flight", fallback: 22 }],
                    size: [0.06, 0.01],
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
            duration: 0,
            emitters: [
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 18 }, at: { data: "flight", fallback: 22 } },
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
