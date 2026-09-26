/**
 * 魔法叶 / magicalleaf 的客户端表现。
 *
 * 一句话：叶在施法者身周旋起、越聚越多，随后整群叶迸出，各自划弧追向对手，从四面八方一起收拢，
 * 命中处炸开一小簇叶屑与草色冲击。
 * 色相家族：草绿（0x7FD34A）与近白（0xEAFBD0），强调处一点亮黄绿；饱和只出现在叶与命中核心的小面积。
 * 拍子：起（gather 聚叶）→ 击（launch 迸叶、seek 追叶、hit 命中、block 撞墙碎叶）→ 收（fade 散尽）。
 * 范围：hit 的命中环半径用 `data.scale`（判定半径 / 0.3）给出，玩家看出每片叶能咬住多大一圈。
 * 运动：gather 的叶由外向内旋聚；launch 的叶向外迸开；seek 的叶沿 projectile 锚点飞行、逐刻转向对手；
 *   block 的碎叶按撞点向外炸开。
 * 数：`data.count`（实际叶数）绑定 gather 的聚叶量与 launch 的迸射数量，`data.trail`（单叶威力换算的尾迹量）
 *   绑定 seek 的发射率，`data.notes`（威力换算的碎叶数）绑定 hit 与 block 的爆开数量，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const MagicalleafDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 6, burst: { count: { data: "count", fallback: 4 }, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.2], spin: 90,
                    lifetime: [8, 15], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0x9EE06A, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "seeds", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xEAFBD0, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [8, 14], size: [0.3, 0.5], sizeMode: "sin",
                    color: 0x6FB84A, alpha: [0.35, 0], light: "world", maxParticles: 10
                }
            ]
        },
        launch: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_leaf", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "count", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.12, 0.32], spread: 10, spin: 120,
                    lifetime: [7, 13], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x7FD34A, alpha: [0.95, 0], light: "full", maxParticles: 40
                },
                {
                    name: "burst_razor", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "count", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.28], spread: 14,
                    lifetime: [6, 11], size: [0.16, 0.03],
                    color: 0xEAFBD0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "burst_ring", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7],
                    color: 0x9EE06A, alpha: [0.55, 0], light: "full"
                }
            ]
        },
        seek: {
            duration: 40,
            exit: { stop: 34, drain: 8 },
            emitters: [
                {
                    name: "leaf_body", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "trail", fallback: 24 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0.01, 0.05], spin: 140,
                    lifetime: [4, 9], size: [0.22, 0.1],
                    color: 0x9EE06A, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "leaf_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "trail", fallback: 24 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.25 }, spin: 90,
                    lifetime: [5, 10], size: [0.09, 0.02],
                    color: 0xEAFBD0, alpha: [0.8, 0], light: "full", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "hit_impact", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "notes", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x9EE06A, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "hit_leaves", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "notes", fallback: 8 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 24, spin: 120,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [9, 17], size: [0.18, 0.03],
                    color: 0x7FD34A, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "hit_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0x6FB84A, alpha: [0.55, 0], light: "full"
                }
            ]
        },
        block: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "block_shatter", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "notes", fallback: 6 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.18], spread: 30, gravity: 0.04,
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x7FD34A, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "block_dust", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "notes", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.03,
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0x9EE06A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0x9EE06A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magicalleaf", 1, MagicalleafDefinition);
