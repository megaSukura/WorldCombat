/**
 * 精神波 / psywave 的客户端表现。
 *
 * 一句话：施法者周身念力紊乱地跳动、把波压到掌心 → 一道念力波前推到瞄准方向、拖着一列可数的环穿人 →
 *   每个被穿到的目标身上炸开一圈随本此强度增减的环。
 * 色相家族：淡紫（0x8E6FE0 主 / 0xB49CF0 亮 / 0xE6DCFF 核心），近白只给穿透核心；无第二个色相。
 * 拍子：起 unstable 0–16t ／ 推 flight 0–70t ／ 中 hit 0–26t ／ 空 miss。
 * 数：`data.rings`（准备期固定下来的环数）驱动 unstable 的环、flight 的后列环与 hit 的环数——数量就是
 *   `data.rings` 本身（有限、稳定），不是每秒速率；`data.tier`（同一强度，0..1）抬高亮度。
 * 范围：环的世界直径 = 画出的粒径 × `data.scale`（波宽 / 0.55），只乘一次；波宽也决定判定。
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
                },
                {
                    // 准备期就把本此待发的环数亮出来：数量精确等于 data.rings，玩家出手前便能读出强弱。
                    name: "pulse", bind: "source", offset: [0, 0.1, 0], height: 0.66, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "rings", fallback: 3 }, interval: 3, repeats: 1 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 16], size: [0.32, 0.8],
                    color: 0x8E6FE0, alpha: [0.75, 0], light: "full", maxParticles: 32
                }
            ]
        },
        flight: {
            duration: 80,
            exit: { stop: 70, drain: 16 },
            emitters: [
                {
                    // 可数后列环：每刻在弹位放一枚环、共 data.rings 枚，拖着一条数量固定的环列。粒径 × data.scale 只乘一次。
                    name: "rings", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, interval: 1, repeats: { data: "rings", fallback: 4 } },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [12, 20], size: [0.8, 1.1], sizeMode: "linear",
                    color: 0x8E6FE0, alpha: [{ data: "tier", fallback: 0.6 }, 0], light: "full", maxParticles: 24
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
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2, repeats: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [8, 16], size: [0.3, 0.9],
                    color: 0x8E6FE0, alpha: [{ data: "tier", fallback: 0.85 }, 0], light: "full", maxParticles: 80
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
                    // 空放/撞墙收在真实末点：留一枚按真实波宽铺开的淡环，说明这一发波前到此为止。
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [1.1, 0.4],
                    color: 0x7A5CB8, alpha: [0.5, 0], light: "world", maxParticles: 12
                },
                {
                    name: "motes", bind: "point", fit: "none", offset: [0, 0.2, 0],
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
