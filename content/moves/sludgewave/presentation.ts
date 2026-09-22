/**
 * 污泥波 / sludgewave 的客户端表现。
 *
 * 一句话：施法者脚边鼓起泥泡，一道黏稠的污泥潮从脚下慢慢向外漫开、把路上的人往后挤，
 * 潮头上翻着毒泡与污泥块；退去后那一圈地上留下缓缓冒泡的污泥洼。
 * 色相家族：污泥绿与毒紫（goo/sludgesplash / goo/ooze / bubble/poisonbubble / mud/mudsplash）为主体，
 * 深绿灰做衬托，毒紫只出现在毒泡的小面积上。
 * 拍子：起（gurgle 冒泡）→ 击（surge 漫潮、hit 溅身）→ 收（recede 退潮、puddle 泥洼 / miss）。
 * 范围：surge 的地面环按服务端传的 `data.radius`（真实漫开半径）画出，圈就是会被泡到的地。
 * 运动：污泥潮从脚下沿地表向外漫（速度比火环慢），泥块带重力落地。
 * 数：`data.flow`（半径派生）决定潮面密度，`data.count`（威力派生）决定命中泥量，`data.cells`（泥洼块数）决定退潮泥量。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SludgewaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gurgle: {
            duration: 14,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "bubbles", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.09], spread: 14,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x9B6BC8, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "ooze", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 10, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0x6E8C3A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        surge: {
            duration: 12,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "tide", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [14, 26], size: [0.3, 0.5],
                    color: 0x7FB84A, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "blobs", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.04, 0.18], spread: 18,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0x5E7A30, alpha: [0.8, 0], light: "world", maxParticles: 140
                },
                {
                    name: "toxbubbles", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "flow", fallback: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.03, 0.12], spread: 16,
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xA879D0, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.28], spread: 18,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "splash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 20], size: [0.18, 0.03],
                    color: 0x7FB84A, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        recede: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "pull_back", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "cells", fallback: 20 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.02, 0.1], spread: 20,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0x6E8C3A, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        puddle: {
            duration: 30,
            exit: { drain: 24 },
            emitters: [
                {
                    name: "puddle_bubbles", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.01, 0.05],
                    drag: 0.9,
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0x9B6BC8, alpha: [0.4, 0], light: "full", maxParticles: 60
                },
                {
                    name: "puddle_sheen", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 8, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.005, 0.03],
                    drag: 0.92,
                    lifetime: [16, 30], size: [0.16, 0.03],
                    color: 0x5E7A30, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sputter", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], spread: 14,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x6E8C3A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sludgewave", 1, SludgewaveDefinition);
