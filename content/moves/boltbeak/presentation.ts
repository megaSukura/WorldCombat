/**
 * 电喙 / boltbeak 的客户端表现。
 *
 * 一句话：施法者喙尖蓄起一簇电 → 贴着地面一路电花直啄出去 → 啄中时炸开一圈电（先手时更亮更白）→
 * 目标身上噼啪留一小段 → 施法者拖着电弧退开。
 * 色相家族：电黄与近白（electricity_yellow / electricity_white / impact_electric），先手一拍多一层冷白。
 * 拍子：起 charge → 冲 dart → 击 strike / first → 留 static → 收（退步尾迹）。
 * 范围：dart 沿突刺逐刻铺开；strike/first 的点爆与环由 `data.scale`（判定半径派生）决定大小。
 * 运动：dart 的电花朝向 `orient: velocity` 沿啄出的方向拉直；退步时前一段电花留在原地散去。
 * 数：`data.sparks`（突刺进度派生）决定冲刺电花，`data.count`（最终威力派生）决定命中碎点，
 *   `data.doubled` 决定先手一拍是否更亮；画面里的数量与机制里的数一致。
 */
const BoltbeakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "beak", bind: "source", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 18, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.16], spread: 24,
                    lifetime: [6, 11], size: [0.1, 0.02],
                    alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "coil", bind: "source", offset: [0, 0, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        dart: {
            duration: 10,
            exit: { stop: 3, drain: 6 },
            emitters: [
                {
                    name: "sparks", bind: "source", offset: [0, 0, 0], height: 0.55, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "sparks", fallback: 30 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.05, 0.2], spread: 16,
                    lifetime: [5, 10], size: [0.13, 0.02],
                    alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "trail", bind: "source", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    trail: { minDistance: 0.3 }, rate: { data: "sparks", fallback: 30 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.07],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.08, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFF0A8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.7 } },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [9, 14], size: [0.3, 0.7],
                    color: 0xFFE066, alpha: [0.8, 0], light: "full", maxParticles: 4
                }
            ]
        },
        first: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 34 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.12, 0.36],
                    lifetime: [6, 13], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 130
                },
                {
                    name: "bolts", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "count", fallback: 26 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.16, 0.42], spread: 22,
                    lifetime: [7, 14], size: [0.14, 0.02],
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.95 } },
                    direction: "outward", speed: [0.12, 0.32],
                    lifetime: [9, 15], size: [0.36, 0.85],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 4
                }
            ]
        },
        static: {
            duration: 0,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crackle", bind: "target", offset: [0, 0, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: { data: "sparks", fallback: 10 }, shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.02, 0.09], spread: 26,
                    lifetime: [7, 14], size: [0.07, 0.01],
                    alpha: [0.75, 0], light: "full", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.13], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 15], size: [0.06, 0.01],
                    color: 0xC8B478, alpha: [0.6, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_boltbeak", 1, BoltbeakDefinition);
