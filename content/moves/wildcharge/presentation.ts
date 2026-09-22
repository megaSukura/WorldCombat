/**
 * 疯狂伏特 / wildcharge 的客户端表现。
 *
 * 一句话：电流从全身收拢、越跑越亮，整个人笔直冲出去；撞实的一刻炸开一圈蓝黄电弧与火花，电流顺着原路回到自己身上；
 * 冲空则积蓄的电就地在脚下泄放成一团火花。
 * 色相家族：电黄（0xF2D03A）与冷白（0xEAF6FF），电弧的蓝（0x5AC8F0）只在命中核心一点。
 * 拍子：起 windup（收拢电流）→ 冲 charge（带电直线冲刺）→ impact（命中电弧峰值）＋ recoil（回路反噬）／ discharge（冲空泄放）。
 * 范围：charge 的冲刺线沿 `data.path` 两顶点铺成一条电弧带，画的就是冲程覆盖到的区域。
 * 运动：速度线沿 `data.direction` 掠过；命中后电弧与火花沿冲撞方向散开；反噬的电流从自己身上朝四周弹开。
 * 数：`data.hits`（电击威力派生）决定命中电弧数，`data.spark`（速度与过载派生）决定冲线与泄放的火花密度，
 * `data.charged`（1 表示目标还没麻痹）决定命中核心是否多一圈蓄能电弧。
 */
const WildchargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.16, 0.03],
                    color: 0xF2D03A, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x5AC8F0, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        charge: {
            duration: 42,
            exit: { stop: 26, drain: 14 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "spark", fallback: 20 }, speed: [0.03, 0.12], spread: 24,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 220
                },
                {
                    name: "arc", bind: "source", offset: [0, 0.5, 0], height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 40, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xF2D03A, alpha: [0.8, 0], light: "full", maxParticles: 240
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.3, 0.24, 0.3] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.26 },
                    lifetime: [5, 8], size: [0.16, 0.05],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 160
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "arc", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "hits", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xF2D03A, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.28], spin: 14,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x5AC8F0, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "charged", fallback: 1 } , repeats: 10, interval: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.22, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        recoil: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "return_arc", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 10 },
                    shape: { kind: "hemisphere", radius: 0.44, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.24],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x5AC8F0, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "leak", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xF2D03A, alpha: [0.6, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 60
                }
            ]
        },
        discharge: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "vent", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "spark", fallback: 18 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.3], spread: 18,
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF2D03A, alpha: [0.95, 0], light: "full", bloom: 0.4
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 16], size: [0.34, 0.07],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        wake: {
            duration: 8,
            emitters: [
                {
                    name: "static", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 8, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0xF2D03A, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wildcharge", 1, WildchargeDefinition);
