/**
 * 高速星星 / swift 的客户端表现。
 *
 * 一句话：星光在身周结成一圈，随后一圈星形光弹向四面迸出，各自划着弧线拐向对手；命中处炸开一小簇金色星屑，
 *         撞到方块则在撞点碎灭。
 * 色相家族：暖金与近白（star、glowingsparkle_yellow、bigsparkle），余韵收在中性浅金。
 * 拍子：起（charge 聚星）→ 击（launch 迸射、seek 追星、hit 命中、block 撞墙熄灭）→ 收（fade 散尽）。
 * 范围：seek 的每颗星沿 projectile 锚点飞行、命中点由 hit 的落点决定；玩家沿着星的飞行弧看清它够到哪、撞在哪。
 * 运动：星从一圈迸出后逐刻转向目标，沿途拖出星屑尾迹；空瞄时按方向散出，不另找目标。
 * 数：`data.count`（星数）绑定 launch 的迸射数量，`data.trail`（单星威力换算的尾迹量）绑定 seek 的发射率，
 * `data.notes`（威力换算的碎星数）绑定 hit／block 的爆开数量，`data.intensity` 抬高亮度，`data.scale` 缩放命中环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SwiftDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xFFE07A, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "sparkle", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.09, 0.03],
                    color: 0xFFF2C0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [8, 14], size: [0.3, 0.5], sizeMode: "sin",
                    color: 0xE8C86A, alpha: [0.35, 0], light: "world", maxParticles: 10
                }
            ]
        },
        launch: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_stars", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "count", fallback: 3 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.3], spread: 8,
                    lifetime: [6, 12], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "burst_sparks", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "count", fallback: 3 } },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFF2C0, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "burst_ring", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        seek: {
            duration: 40,
            exit: { stop: 34, drain: 8 },
            emitters: [
                {
                    name: "star_body", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "trail", fallback: 26 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0.01, 0.05], spin: 90,
                    lifetime: [4, 9], size: [0.2, 0.1],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "star_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "trail", fallback: 26 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.2 },
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xFFF2C0, alpha: [0.8, 0], light: "full", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hit_flash", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [7, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "hit_sparks", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "notes", fallback: 6 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFF2C0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "hit_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        block: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shatter", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "notes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.14, 0.05], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "sparks", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "notes", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFF2C0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0xB9A06A, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_swift", 1, SwiftDefinition);
