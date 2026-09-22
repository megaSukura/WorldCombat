/**
 * 精神冲击 / psyshock 的客户端表现。
 *
 * 一句话：施法者手前把念波压成一枚半透明的念力棱 → 棱脱手后拖着一道硬边碎光走直线、缓缓下沉 →
 *   撞上目标时炸成一团棱屑与一圈贴地小环。
 * 色相家族：靛紫（0x7A52E6 主 / 0xB49CF0 亮 / 0xC9B4F5 核心），近白只给撞碎的那一下；无第二个色相。
 * 拍子：起 mold 0–18t ／ 掷 flight 0–60t ／ 撞 impact 0–26t ／ 空 miss。
 * 范围：impact 的贴地小环半径绑 `data.scale`（判定半径 / 0.3），玩家一眼看出站哪会被棱扫到。
 * 运动：mold 向内收拢压实；flight 绑 projectile 沿飞行方向撒硬边碎光；impact 由内向外炸、棱屑受重力落下。
 * 数：`data.vanes`（特攻与等级派生的棱屑数）驱动 mold 的收拢量与 impact 的碎屑量，`data.intensity` 抬高亮度。
 */
const PsyshockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mold: {
            duration: { data: "windup", fallback: 11 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.1, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "vanes", fallback: 16 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.03, 0.13],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0x8E6FE0, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "core", bind: "source", offset: [0, 0.1, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 8, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xC9B4F5, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 100,
            exit: { stop: 90, drain: 14 },
            emitters: [
                {
                    name: "shard", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.2, 0.03],
                    color: 0xB49CF0, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "grit", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    trail: { minDistance: 0.35 }, rate: { data: "vanes", fallback: 12 },
                    direction: "away", speed: [0.0, 0.05], spread: 22,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0x7A52E6, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "break", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: 9, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEDE4FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 10
                },
                {
                    name: "shards", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "vanes", fallback: 16 }, interval: 1, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26, gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xB49CF0, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "ring", bind: "target", offset: [0, -0.5, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [10, 16], size: [0.4, 0.9],
                    color: 0x7A52E6, alpha: [0.6, 0], light: "full", maxParticles: 5
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0x6B58A0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psyshock", 1, PsyshockDefinition);
