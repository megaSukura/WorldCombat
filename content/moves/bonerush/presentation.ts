/**
 * 骨棒乱打 / bonerush 的客户端表现。
 *
 * 一句话：施法者把手里那截硬骨一枚枚按弧线抛出，骨头落地砸出贴地的震波圈与碎石，落点那层地面被震出裂痕、
 *   过一会儿自己长回去；每一击都比上一击更近落地，最后一击的圈最大。
 * 色相家族：骨白（0xEAE0C8）做骨头与震波，落尘土黄（0xD8C9A6）与暗褐（0x8A7458）做地面；没有第二个色相。
 * 拍子：起 draw（拔骨聚光）→ 掷 throw（骨头弧线飞行）→ 夯 slam（落点震波）→ 裂 crack（地痕）→ 中 hit → 收 settle。
 * 范围：slam 用 `data.shock` 画贴地的整圈震波，圈的大小就是落点判定半径；crack 用 `data.radius` 铺开地痕，
 *   玩家一眼看出骨头落在哪、波及多广。
 * 运动：throw 绑定 `data.projectile`，碎屑贴着飞行中的骨头拖出轨迹，读出「骨头走的是弧线」。
 * 数：`data.dust`（物攻派生）绑定每一击的发射量，`data.intensity`（每击威力派生）抬高亮度，
 *   `data.final`（末击倍率派生）让最后一击的圈更亮更大。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BonerushDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "grip", bind: "source", offset: [0, 0.5, -0.25], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: 4, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.1], spread: 28, drag: 0.9,
                    lifetime: [6, 11], size: [0.16, 0.04],
                    color: 0xEAE0C8, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 220
                },
                {
                    name: "foot", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 4, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12], spread: 24, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x8A7458, alpha: [0.4, 0], light: "world", maxParticles: 180
                }
            ]
        },
        throw: {
            duration: 200,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.12], spread: 40, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xD8C9A6, alpha: [0.5, 0], light: "world", maxParticles: 160
                }
            ]
        },
        slam: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wave", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "shock", fallback: 1 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "shock", fallback: 1.6 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.3], spread: 6, drag: 0.9,
                    lifetime: [8, 14], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.7, 0], light: "world", bloom: 0.15, maxParticles: 200
                },
                {
                    name: "burst", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.16],
                    lifetime: [7, 13], size: [0.55, 0.12],
                    color: 0xEAE0C8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "debris", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "shock", fallback: 1.6 } },
                    direction: "outward", speed: [0.14, 0.5], spread: 30, gravity: 0.08, drag: 0.9,
                    lifetime: [9, 16], size: [0.12, 0.02],
                    color: 0xD8C9A6, alpha: [0.6, 0], light: "world", maxParticles: 240
                }
            ]
        },
        crack: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "seam", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 8 }, at: 0, repeats: 2, interval: 4 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.2 }, thickness: 1, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18], spread: 40, gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x8A7458, alpha: [0.55, 0], light: "world", maxParticles: 260
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.25, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.03, 0.14],
                    lifetime: [7, 13], size: [0.48, 0.1],
                    color: 0xEAE0C8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 }, direction: "outward", speed: [0.12, 0.4], spread: 32, gravity: 0.07, drag: 0.9,
                    lifetime: [9, 16], size: [0.08, 0.02],
                    color: 0x8A7458, alpha: [0.5, 0], light: "world", maxParticles: 220
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.1, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [8, 14], size: [0.18, 0.05],
                    color: 0xD8C9A6, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bonerush", 1, BonerushDefinition);
