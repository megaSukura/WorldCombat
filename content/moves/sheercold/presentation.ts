/**
 * 绝对零度 / sheercold 的客户端表现。
 *
 * 一句话：施法者身上先凝起白霜，脚下一圈寒气打转；锁定的落点边缘凝霜随预告收紧，结霜一刻整片地面同时碎霜上翻，
 *   圈里的东西被冻住，地上只留下一层低亮、不造成伤害、很快散去的残霜。
 * 色相家族：冰青与近白（0x7FD8E8 / 0xA8ECF5 / 0xE8FBFF）为主体，深青 0x4A9BD0 只在余韵与地霜；
 *   近白只给结霜那一瞬的核心——与地裂的土黄、角钻的暖金属、断头钳的骨白明确分开。
 * 拍子：起（windup 白霜聚拢）→ 定（mark 冻圈收紧倒计时，持续结霜延迟）→ 击（hit 逐个冻伤、bloom 整圈碎霜）→ 收（rime 低亮残霜散去）。
 * 范围：mark 与 bloom 的地面圆以固定参考半径书写、由 `data.scale = 实际冻结半径 / 2.6` 放大，玩家看到的圈就是会被冻到的地。
 * 收紧：mark 的内圈用 `data.ring`（服务端随倒计时缩小），边缘一圈看得见地收拢；`data.radius` 是真实冷域半径。
 * 数：`data.hush`（特攻派生）决定寒雾密度，`data.cells`（霜晶数量）决定地霜密度。
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
                    name: "shiver", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "hush", fallback: 22 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.9 },
                    direction: "inward", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xA8ECF5, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 22, shape: { kind: "ring", radius: { data: "ring", fallback: 2.6 } },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0x7FD8E8, alpha: [0.4, 0], light: "world", maxParticles: 70
                },
                {
                    name: "still", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 3, repeats: 3, interval: 7, at: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE8FBFF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bite", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "hush", fallback: 14 }, at: 1 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [5, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "sheet", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "hush", fallback: 30 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.95 },
                    direction: "up", speed: [0.08, 0.4], spread: 20, drag: 0.93,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0xDCF6FC, alpha: [0.9, 0], light: "full", maxParticles: 200
                },
                {
                    name: "spikes", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "hush", fallback: 18 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.1, 0.45], spread: 24, gravity: 0.05, drag: 0.94,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xA8ECF5, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "hush", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.36], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "mist", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: { data: "hush", fallback: 30 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.04, 0.16], spread: 14, drag: 0.9,
                    lifetime: [16, 30], size: [0.24, 0.5], sizeMode: "linear",
                    color: 0x7FD8E8, alpha: [0.35, 0], light: "world", maxParticles: 180
                }
            ]
        },
        rime: {
            duration: { data: "ticks", fallback: 120 }, exit: { drain: 20 },
            emitters: [{ name: "frost_trace", bind: "point", height: 0, offset: [0, 0.03, 0],
                particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                rate: { data: "cells", fallback: 18 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                direction: "up", speed: [0.005, 0.025], lifetime: [8, 16], size: [0.06, 0.02],
                color: 0xA8ECF5, alpha: [0.24, 0], light: "world", maxParticles: 60 }]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sigh", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 16 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.1], spread: 14,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xA8ECF5, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sheercold", 1, SheerColdDefinition);

// Actual sphere radius, with fixed meridians exposing the height of the cold volume.
WorldCombatClient.scene("world_combat:move_sheercold/volume", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle || !(Number(data.radius) > 0)) return;
    const p = entry.position, r = Number(data.radius), color = 0x708FE8F2;
    frame.ring(p[0], p[1] + .04, p[2], r, color);
    for (let i = 0; i < 24; i++) {
        const a = Math.PI * i / 24, b = Math.PI * (i + 1) / 24;
        frame.line(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[2], p[0] + Math.cos(b) * r, p[1] + Math.sin(b) * r, p[2], color);
        frame.line(p[0], p[1] + Math.sin(a) * r, p[2] + Math.cos(a) * r, p[0], p[1] + Math.sin(b) * r, p[2] + Math.cos(b) * r, color);
    }
});
