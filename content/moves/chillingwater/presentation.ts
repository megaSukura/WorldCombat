/**
 * 泼冷水 / chillingwater 的客户端表现。
 *
 * 一句话：施法者头顶兜起一颗冷冽翻涌的水团 → 水团拖着一路水花飞向对手 → 迎头炸开一蓬冷水 →
 *   目标身上挂着往下滴的水痕（湿透）→ 冰面形态下，落点结起一圈泛白的冰。
 * 色相家族：冷水青蓝（0x6FC3E8／0x8FD6F5）为主，冰白（0xEAF9FF）只给水花高光与冰面。
 * 拍子：起 windup（兜水）→ 飞 throw（水团）→ 泼 drench（炸开）→ 湿 soak（目标滴水）→ 冰 glaze（落点结冰）。
 * 范围：单体招；命中发生在目标身上，冰面形态的冰圈半径读 `data.radius`（体型派生的冰面半径）。
 * 运动：水团沿发射方向直线飞行（服务端投射物），水花从落点向外炸开、水痕贴着目标往下滴。
 * 数：水花数量绑定 `data.drops`（特攻与等级派生），掉攻级数绑定 `data.stages`，冰面块数绑定 `data.cells`，
 *   强度绑定 `data.intensity`（单发威力 / 50）。
 */
const ChillingwaterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 1.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1], spin: 10,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0x6FC3E8, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "chill", bind: "source", offset: [0, 1.15, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xEAF9FF, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        throw: {
            duration: 60,
            exit: { stop: 50, drain: 12 },
            emitters: [
                {
                    name: "jet", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 24, shape: { kind: "sphere", radius: 0.14 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0x8FD6F5, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "spray", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    trail: { minDistance: 0.3 }, rate: { data: "drops", fallback: 8 },
                    direction: "down", speed: [0.0, 0.05], spread: 22, gravity: 0.03, drag: 0.94,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xEAF9FF, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        drench: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "drops", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.28], spread: 26,
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEAF9FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "cold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x8FD6F5, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        soak: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "drip", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "down", speed: [0.0, 0.05], gravity: 0.05,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8FD6F5, alpha: [0.5, 0], alphaMode: "sin", light: "world", maxParticles: 24
                }
            ]
        },
        glaze: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "sheet", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "cells", fallback: 20 }, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [14, 26], size: [0.2, 0.05],
                    color: 0xF2FBFF, alpha: [0.45, 0], light: "world", maxParticles: 160
                },
                {
                    name: "face", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 6, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xEAF9FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chillingwater", 1, ChillingwaterDefinition);
