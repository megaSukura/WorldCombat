/**
 * 飞踢 / jumpkick 的客户端表现。
 *
 * 一句话：施法者缩身踩地，沿一条低平的浅弧腾空，腿在弧线上扫出一道亮线；踢实的一刻在对手身上炸开
 * 格斗系冲击、沿踢向把它踹出一圈尘；踢偏则是脚踝磕地、在落点砸出一圈土。
 * 色相家族：草木米白（0xF2F5E8）与嫩绿（0xA9CF7A）为家族色，命中冲击偏近白，落尘用中性 tinydust。
 * 拍子：起 windup（缩身）→ 跃 leap（浅弧爬升）→ 俯 dive（沿弧线压下）→ 击 impact ／ 失 crash。
 * 范围：dive 的 `bind:"path"` 沿锁定的落点铺出下降走廊，画的就是这一踢覆盖到的地方；impact 的地环按
 *   `data.hitRadius`（命中半径）铺开，站在圈里会被扫到。
 * 运动：leap 是自下而上的速度线，dive 是沿 `data.direction` 斜切而下的弧线，impact 是向外崩开的冲击环。
 * 数：`data.count`（踢劲派生）决定命中迸发量，`data.dust`（体重与物攻派生）决定扬尘密度，
 *   `data.intensity`（踢劲 / 100）抬高亮度，`data.scale`（命中半径 / 0.65）放大尘环。
 */
const JumpkickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.11], spread: 12,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xB9A98A, alpha: [0.5, 0], gravity: 0.03, light: "world", maxParticles: 26
                },
                {
                    name: "coil", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 13], size: [0.16, 0.04],
                    color: 0xA9CF7A, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        },
        leap: {
            duration: 24,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", height: 0.1, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.26 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xF2F5E8, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "kickup", bind: "source", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 12 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xB9A98A, alpha: [0.5, 0], gravity: 0.04, drag: 0.92, light: "world", maxParticles: 90
                }
            ]
        },
        dive: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    shape: { kind: "polyline" },
                    rate: 22, speed: [0.02, 0.08], spread: 18,
                    lifetime: [6, 11], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF2F5E8, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "rush", bind: "source", height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.3, 0.24, 0.3] },
                    direction: "shape", speed: [0.02, 0.09], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.17, 0.05],
                    color: 0xA9CF7A, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26], spread: 16,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF6F8EE, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: { data: "hitRadius", fallback: 0.65 } },
                    direction: "outward", speed: [0.07, 0.2], spread: 10,
                    lifetime: [10, 16], size: [0.28, 0.07],
                    color: 0xCDE0AC, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        crash: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "thud", bind: "source", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.06, 0.2], spread: 14,
                    lifetime: [9, 15], size: [0.42, 0.1], sizeMode: "index",
                    color: 0xB9A98A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grit", bind: "source", height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [9, 16], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.04, drag: 0.9, light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_jumpkick", 1, JumpkickDefinition);
