/**
 * 千变万花 / flowertrick 的客户端表现。
 *
 * 一句话：施法者理好一束花、扬手掷出；花束翻飞着拐弯追上门，碰到目标的一瞬整束绽开、花瓣向四面扑开，
 *   落点铺下一片粉色花瓣。
 * 色相家族：花粉（0xF0A6C8 / 0xF6D6E6）为主体，近白（0xFFF2F6）在花瓣与强调；草绿（0x8CC24E）只在茎叶的小面积。
 * 拍子：起 windup（理花）→ 行 flight（花束翻飞追人）→ 击 bloom（命中绽开）→ 果 petalbed（落点花瓣）→ 收 miss（撞墙散花）。
 * 范围：bloom 的花瓣圈按 `data.bloomRadius` 铺开，玩家看出这一束能波及多大一圈。
 * 运动：flight 由动作拥有的 actionScenes 绑定真实弹体；有目标时由引擎追踪，空投时沿 `data.direction` 直飞。bloom 的花瓣沿 `direction: "outward"` 扑开并受重力落回。
 * 数：`data.petals`（物攻与等级派生）决定飞行与绽开的花瓣密度，`data.cells`（terrainResult 真正放下的花瓣格数）决定地面花瓣数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FlowertrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09], spin: 60,
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xF6D6E6, alpha: [0.75, 0], light: "full", maxParticles: 44
                },
                {
                    name: "gather_spark", bind: "source", offset: [0, 0.05, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xFFF2F6, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 120,
            exit: { stop: 96, drain: 18 },
            emitters: [
                {
                    name: "petals", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: { data: "petals", fallback: 20 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "away", speed: [0.02, 0.1], spread: 40, spin: 90,
                    lifetime: [7, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xF0A6C8, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "leaf", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    trail: { minDistance: 0.3 }, rate: 8,
                    direction: "away", speed: [0.02, 0.08], spread: 30, spin: 120,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x8CC24E, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        bloom: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "petals", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26, spin: 120,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [12, 22], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xF0A6C8, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.04, 0.18],
                    lifetime: 8, size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF2F6, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 12
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "bloomRadius", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [12, 20], size: [0.4, 0.9],
                    color: 0xF6D6E6, alpha: [0.55, 0], light: "full", bloom: 0.25
                },
                {
                    name: "confetti", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spin: 200,
                    gravity: 0.04, drag: 0.93,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0xFFF2F6, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        petalbed: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "bed", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "cells", fallback: 5 } },
                    shape: { kind: "box", size: [2.0, 0.15, 2.0] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xF6D6E6, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "sprout", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0x8CC24E, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spin: 90, gravity: 0.02,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xF0A6C8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flowertrick", 1, FlowertrickDefinition);
