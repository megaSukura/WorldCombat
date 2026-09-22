/**
 * 冰冻之风 / icywind 的客户端表现。
 *
 * 一句话：嘴边先卷起一圈白气，随后一堵半透明的冷气锋贴着地面向前推出整条走廊，锋线上结着一排冰晶，
 * 走过的地面慢慢泛白；被扫到的人身上炸开一撮冰屑。
 * 色相家族：冰白（0xEAF9FF）为主、浅蓝（0xBFE9FF／0x8FD6F5）作锋线与冰晶，白色小点只做细节。
 * 拍子：起（gather 嘴边聚霜）→ 击（front 锋面推移 + swept 逐个冻上）→ 收（rimes 地面白霜停留）。
 * 范围：front 的锋线用 `data.path`（服务端走廊断面顶点）画 polyline，锋到哪、哪就会挨冻；rimes 用
 *   `data.path` 的四个走廊角画 polygon，白霜铺过的地就是这招的范围。
 * 运动：锋面沿玩家朝向推进，锋线上的冰晶沿走廊方向被吹动，地面雾慢一步跟上。
 * 数：`data.flow`（走廊宽度派生）决定锋面密度，`data.count`（威力派生）决定命中冰屑量，
 *   `data.scale`（射程 / 参考射程）控制粒子尺寸，`data.drop`（减速级数）决定命中的冷色强度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const IcywindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xEAF9FF, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [7, 13], size: [0.2, 0.05],
                    color: 0xBFE9FF, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        front: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "edge", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 70 }, direction: "up", speed: [0.03, 0.14], spread: 16,
                    lifetime: [6, 13], size: [0.15, 0.03],
                    color: 0xBFE9FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 220
                },
                {
                    name: "bank", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 60 }, direction: "up", speed: [0.02, 0.1], spin: 8,
                    lifetime: [10, 20], size: [0.24, 0.06],
                    color: 0xEAF9FF, alpha: [0.3, 0], light: "world", maxParticles: 200
                },
                {
                    name: "floor", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "up", speed: [0.01, 0.06], drag: 0.92,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xEAF9FF, alpha: [0.28, 0], light: "world", maxParticles: 160
                }
            ]
        },
        swept: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "clung", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 14, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0x8FD6F5, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rimes: {
            duration: 30,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "sheet", bind: "path", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "cells", fallback: 30 }, interval: 4, repeats: 2 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0xF2FBFF, alpha: [0.4, 0], light: "world", maxParticles: 200
                },
                {
                    name: "motes", bind: "path", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polygon" },
                    rate: 30, direction: "up", speed: [0.01, 0.05], spin: 12,
                    lifetime: [14, 26], size: [0.08, 0.02],
                    color: 0xBFE9FF, alpha: [0.4, 0], light: "full", maxParticles: 160
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icywind", 1, IcywindDefinition);
