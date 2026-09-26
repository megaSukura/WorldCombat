/**
 * 绝对零度 / sheercold 的客户端表现。
 *
 * 一句话：施法者身上先凝起白霜，脚下一圈寒气打转；锁定的一圈地面随后整片结霜、向上翻起一团青白寒雾，
 *   圈里的一切被冻住，地上留下一层很快消退的雪壳。
 * 色相家族：冰青与近白（0x7FD8E8 / 0xA8ECF5 / 0xE8FBFF）为主体，深青 0x4A9BD0 只在余韵与地霜；
 *   近白只给结霜那一瞬的核心——与地裂的土黄、角钻的暖金属、断头钳的骨白明确分开。
 * 拍子：起（windup 白霜聚拢）→ 定（mark 冻圈预览，持续结霜延迟）→ 击（bloom 整圈结霜爆发）→ 收（霜留在地上）。
 * 范围：mark 与 bloom 的地面圆以固定参考半径书写、由 `data.scale = 实际冻结半径 / 2.6` 放大，玩家看到的圈就是会被冻到的地。
 * 运动：寒气从圈外向内收拢、在结霜一刻整圈同时向上翻起，霜晶随后贴地缓缓消散。
 * 数：`data.hush`（特攻派生）决定寒雾密度，`data.cells`（寒霜块数）决定地霜密度；`data.kills` 决定击中高光的强度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SheerColdDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "frost", bind: "source", offset: [0, 0.9, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08], spin: 20,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xA8ECF5, alpha: [0.7, 0], light: "full", bloom: 0.15, maxParticles: 44
                },
                {
                    name: "chill", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 18, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0x7FD8E8, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "shiver", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "hush", fallback: 22 }, shape: { kind: "circle", radius: 2.6, thickness: 0.9 },
                    direction: "inward", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xA8ECF5, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 22, shape: { kind: "ring", radius: 2.6 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0x7FD8E8, alpha: [0.4, 0], light: "world", maxParticles: 70
                },
                {
                    name: "still", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 3, repeats: 3, interval: 7, at: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE8FBFF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "sheet", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "hush", fallback: 30 }, at: 1 },
                    shape: { kind: "circle", radius: 2.6, thickness: 0.95 },
                    direction: "up", speed: [0.08, 0.4], spread: 20, drag: 0.93,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0xDCF6FC, alpha: [0.9, 0], light: "full", maxParticles: 200
                },
                {
                    name: "spikes", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "hush", fallback: 18 }, at: 1 },
                    shape: { kind: "circle", radius: 2.6, thickness: 0.9 },
                    direction: "up", speed: [0.1, 0.45], spread: 24, gravity: 0.05, drag: 0.94,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xA8ECF5, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "hush", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.36], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "mist", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: { data: "hush", fallback: 30 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "outward", speed: [0.04, 0.16], spread: 14, drag: 0.9,
                    lifetime: [16, 30], size: [0.24, 0.5], sizeMode: "linear",
                    color: 0x7FD8E8, alpha: [0.35, 0], light: "world", maxParticles: 180
                }
            ]
        },
        rime: {
            duration: { data: "ticks", fallback: 120 }, exit: { stop: 4, drain: 14 },
            emitters: [{ name: "frost_trace", bind: "point", height: 0, offset: [0, 0.03, 0],
                particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                rate: { data: "cells", fallback: 18 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                direction: "up", speed: [0.005, 0.025], lifetime: [8, 16], size: [0.06, 0.02],
                color: 0xA8ECF5, alpha: [0.28, 0], light: "world", maxParticles: 60 }]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sigh", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 2.6, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.1], spread: 14,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xA8ECF5, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sheercold", 1, SheerColdDefinition);
