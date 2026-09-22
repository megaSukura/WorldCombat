/**
 * 攀岩 / rockclimb 的客户端表现。
 *
 * 一句话：施法者低头蹬地、脚下尘土向内一收 → 整个身体划一道低拱的土线扑出去、身后拖一层碎土 →
 * 落地砸出一圈贴地的尘环与飞溅的土块；被撞晕的人头顶冒星，出手被打散时还踉跄半步。
 * 色相家族：土棕（0x9A6B3F 主 / 0x5E4426 暗 / 0xD9C4A0 亮），近白只给落地冲击核心。
 * 拍子：起 crouch（收土）→ 行 leap/air（扑跃带土线）→ 击 slam（落地尘环）→ 果 daze（星星）
 *   → 踉跄 stumble → 收 crater（土痕）→ 续 linger（低密度余韵）。
 * 范围：crater 的尘环与土块半径直接绑定 `data.radius`（实际落地范围），画出的就是判定砸到的圈。
 * 运动：crouch 向内收；air 沿扑跃方向拖土屑；slam 的尘环贴地外推、土块先上后落。
 * 数：`data.motes`（物攻与等级派生）决定扑跃尾迹与落地土屑密度，`data.cells`（蹬翻格数）决定土痕层点数。
 */
const RockclimbDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "dig", bind: "source", offset: [0, 0.02, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xD9C4A0, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.02, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9A6B3F, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        leap: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "kick", bind: "source", offset: [0, 0.05, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 40, gravity: 0.05,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x9A6B3F, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        air: {
            exit: { stop: 20, drain: 10 },
            emitters: [
                {
                    name: "wake", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: { data: "motes", fallback: 10 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "away", speed: [0.0, 0.04], spread: 30,
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xD9C4A0, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        slam: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.05, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "clods", bind: "target", offset: [0, 0.1, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 45, gravity: 0.06,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x9A6B3F, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        crater: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.06, 0.18], gravity: 0,
                    lifetime: [10, 18], size: [0.3, 0.6],
                    color: 0x9A6B3F, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "cells", fallback: 6 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.0 } },
                    direction: "up", speed: [0.02, 0.07], gravity: 0.03,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD9C4A0, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        daze: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "stars", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.2, 0.09], sizeMode: "sin",
                    color: 0xD9C4A0, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        stumble: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "target", offset: [0, 0.02, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04,
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0x9A6B3F, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.05,
                    lifetime: [8, 16], size: [0.13, 0.02],
                    color: 0x9A6B3F, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_star", bind: "target", offset: [0, 0.3, 0], height: 1.06,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 28], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xD9C4A0, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "linger_dust", bind: "target", offset: [0, 0.02, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0x9A6B3F, alpha: [0.3, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockclimb", 1, RockclimbDefinition);
