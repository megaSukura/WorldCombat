/**
 * 精神波 / psywave 的客户端表现。
 *
 * 一句话：施法者周身念力紊乱地跳动、把波压到掌心 → 一道直立的念力波前沿瞄准方向推出去、拖着螺旋碎光穿人 →
 *   每个被穿到的目标身上炸开一圈随本此强度增减的环。
 * 色相家族：淡紫（0x8E6FE0 主 / 0xB49CF0 亮 / 0xE6DCFF 核心），近白只给穿透核心；无第二个色相。
 * 拍子：起 unstable 0–16t ／ 推 flight 0–70t ／ 中 hit 0–26t ／ 空 miss。
 * 范围：flight 的直立波前环半径与 hit 的贴地环都按 `data.scale`（波宽 / 0.55）铺开；波宽也决定判定。
 * 运动：unstable 上下乱跳；flight 绑 projectile 并把环立到运动方向上（`orient: velocity`）；hit 由内向外炸。
 * 数：`data.rings`（本此强度系数派生的环数）驱动波前与命中的发射量，`data.intensity`（同一系数）抬高亮度与尺寸——
 *   玩家因此能一眼读出这一发是强是弱。
 */
const PsywaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        unstable: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "jitter", bind: "source", offset: [0, 0.1, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "rings", fallback: 4 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.03], sizeMode: "sin",
                    color: 0x8E6FE0, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "core", bind: "source", offset: [0, 0.1, 0], height: 0.66,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xE6DCFF, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 80,
            exit: { stop: 70, drain: 16 },
            emitters: [
                {
                    name: "front", bind: "projectile", fit: "none", orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: { data: "rings", fallback: 4 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.55 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.4, 0.9],
                    color: 0x8E6FE0, alpha: [0.7, 0], light: "full", maxParticles: 48
                },
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.16 }, direction: "velocity", speed: [0.0, 0.04],
                    lifetime: [6, 12], size: [0.22, 0.04],
                    color: 0xB49CF0, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "drift", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: { data: "rings", fallback: 4 },
                    direction: "away", speed: [0.0, 0.05], spread: 26,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9A6AD8, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: 9, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF0E8FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "rings", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 16], size: [0.3, 0.9],
                    color: 0x8E6FE0, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "glint", bind: "target", offset: [0, 0.1, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "rings", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.24], drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xB49CF0, alpha: [0.9, 0], light: "full", maxParticles: 60
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
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0x7A5CB8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psywave", 1, PsywaveDefinition);
