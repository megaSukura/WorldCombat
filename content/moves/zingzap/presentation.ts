/**
 * 麻麻刺刺 / zingzap 的客户端表现。
 *
 * 一句话：施法者蹲身、身周静电噼啪 → 带着一路黄白电花冲出去、电花随冲程变密 → 撞上时炸开一圈电光、
 * 目标身上噼啪留一小段 → 电沿一条电弧跳到旁边的人 → 被电懵的人头上晃星。
 * 色相家族：电黄与近白（electricity_yellow / electricity_white / impact_electric / paralysis_spark）为主体，
 *   青白只在电弧那一拍进入。
 * 拍子：起 windup（蹲身）→ 冲 start/charge（带电梯口）→ 放 discharge（炸开）→ 跳 arc（电弧）→ 懵 flinch。
 * 范围：charge 沿冲刺逐刻铺开；discharge 在接触点炸一圈，圈内点数按 `data.sparks`（冲程蓄电派生）与强度决定。
 * 运动：charge 的电花朝向 `orient: velocity` 沿冲刺方向；arc 沿机制给的 path 画出电从命中点到第二人的走线。
 * 数：`data.sparks`（冲程蓄电派生）决定冲刺电花、放电碎点与电弧亮点，`data.charge`（0..1，冲程比例）决定起手/冲刺
 *   的持续亮度，`data.intensity`（实际威力派生）抬高放电亮度，`data.scale`（接触判定派生）缩放尺寸。
 */
const ZingZapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spread: 30,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    alpha: [0.9, 0], light: "full", maxParticles: 36
                },
                {
                    name: "ground", bind: "source", offset: [0, 0, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        start: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "burst", bind: "source", offset: [0, 0, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.28], spread: 26,
                    lifetime: [6, 12], size: [0.18, 0.03],
                    alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "sparks", bind: "source", offset: [0, 0, 0], height: 0.5, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "sparks", fallback: 30 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "away", speed: [0.04, 0.16], spread: 28,
                    lifetime: [6, 12], size: [0.14, 0.02],
                    alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "trail", bind: "source", offset: [0, 0, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    trail: { minDistance: 0.25 }, rate: { data: "sparks", fallback: 30 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.09, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        discharge: {
            duration: 28,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 5, interval: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: 9, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 14
                },
                {
                    name: "bolts", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "sparks", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.34], spread: 30,
                    lifetime: [6, 12], size: [0.18, 0.03],
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 16], size: [0.3, 0.8],
                    color: 0xFFE066, alpha: [0.8, 0], light: "full", maxParticles: 4
                },
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.38, 0],
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 34,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 18], size: [0.08, 0.01],
                    alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        arc: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "chain", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "sparks", fallback: 22 } },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.03, 0.14], spread: 24,
                    lifetime: [6, 12], size: [0.16, 0.02], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "arc_spark", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        static: {
            duration: 0,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crackle", bind: "target", offset: [0, 0, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: { data: "sparks", fallback: 10 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.1], spread: 30,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "flicker", bind: "target", offset: [0, 0, 0], height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 2, interval: 8, repeats: 8 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    alpha: [0.8, 0], light: "full", maxParticles: 16
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
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "source", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.14], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xC8B478, alpha: [0.6, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_zingzap", 1, ZingZapDefinition);
