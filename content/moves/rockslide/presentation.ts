/**
 * 岩崩 / rockslide 的客户端表现。
 *
 * 一句话：施法者脚边卷起石屑，随后一块块岩石沿弧线甩出去、拖着小段土烟，落点各炸开一小圈岩石碎块与尘土，
 * 全部落定后那片地上留下一层碎石灰；被砸懵的人头上晃星。
 * 色相家族：岩棕与石灰（earth / large_rock / impact_rock / tinydust）为主体，近白只做每一下撞击的高光。
 * 拍子：起（windup 聚石屑）→ 击（throw 脱手、launch 逐块飞行、hit 逐圈落点）→ 收（miss 落空扬尘）。
 * 范围：每块的 hit 按 `data.scale`（单块判定 / 1.05）画一圈；块数让画面自己铺满整片覆盖区。
 * 运动：launch 绑 projectile，沿抛物线拖尾；hit 碎块带重力四散。
 * 数：`data.count`（本击威力派生）决定落点碎块量，`data.rate`（出手速度派生）决定飞行拖尾密度，
 * `data.intensity` 抬高撞击亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const RockslideDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "source", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 44
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "rocks", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "count", fallback: 3 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.18, 0.04],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "swing", bind: "source", height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [6, 11], size: [0.2, 0.04],
                    color: 0xC8BCA8, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        launch: {
            duration: 100,
            exit: { stop: 24, drain: 20 },
            emitters: [
                {
                    name: "trail", bind: "projectile", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "rate", fallback: 50 }, shape: { kind: "sphere", radius: 0.2 },
                    trail: { minDistance: 0.3 }, direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 160
                },
                {
                    name: "chips", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "rate", fallback: 50 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.08], spread: 20,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x6E5A44, alpha: [0.5, 0], gravity: 0.04, light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: { data: "count", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.32], spread: 16,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "rubble", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.1, 0.42], spread: 30,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        flinch: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.18], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockslide", 1, RockslideDefinition);
