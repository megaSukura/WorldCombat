/**
 * 日光刃 / solarblade 的客户端表现。
 *
 * 一句话：日光在施法者身侧竖着收成一把薄刃 → 身体贴着那道刃贴地踏出去 → 在终点扫出一记亮弧 →
 *         被扫到的活体各自炸开一簇草绿的碎光；挥空只留一小片散开的光屑。
 * 色相家族：金白（0xFFFBE8 的刃芯、0xFFD873 的刀身）＋中性尘；草绿（impact_grass）只作为命中点的小面积属性强调。
 * 拍子：起 gather（凝刃）→ 击 dash（贴身突进）＋ slash（亮弧扫开）＋ hit（命中点，或 fizzle 挥空）→ 收（弧光淡去）。
 * 范围：slash 用服务端同一个扇形（半径 reach、张开 arc）画成一道以突进终点为心的亮弧，站进弧里就会被扫到。
 * 运动：dash 沿 path 从起点到终点贴地犁出去；slash 的弧以 direction 为轴扫开；命中点向外炸开。
 * 数：`data.blade`（日光与攻击换算）决定凝刃与挥斩的密度，`data.intensity`（威力/130）决定亮度，
 *     `data.reach` 与 `data.arc` 决定弧的尺度和张角，`data.scale`（半径/3.2）决定碎光大小。
 */
const SolarBladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 20 },
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "gather_web", bind: "source", offset: [0.45, 0.75, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: 5, shape: { kind: "line", length: 1.5 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [5, 9], size: [1.4, 0.9], sizeMode: "sin",
                    color: 0xFFD873, alpha: [0.5, 0], light: "full", bloom: 0.5, maxParticles: 24
                },
                {
                    name: "gather_motes", bind: "source", offset: [0.35, 0.75, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "blade", fallback: 12 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.16], spin: 12,
                    lifetime: [6, 13], size: [0.07, 0.02],
                    color: 0xFFF6C8, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xD8C48C, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        dash: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dash_lines", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    rate: { data: "blade", fallback: 14 }, direction: "shape", speed: [0.05, 0.2],
                    lifetime: [4, 9], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "dash_grit", bind: "path", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 14], size: [0.06, 0.02],
                    color: 0xB8A87E, alpha: [0.45, 0], light: "world", maxParticles: 80
                }
            ]
        },
        slash: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "slash_arc", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "sector", radius: { data: "reach", fallback: 3.2 }, innerRadius: { data: "reach", fallback: 3.2 }, angleDegrees: { data: "arc", fallback: 120 } },
                    orient: "heading", fit: "world",
                    burst: { count: { data: "blade", fallback: 16 } },
                    direction: "shape", speed: [0.06, 0.22], spread: 12,
                    lifetime: [5, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "slash_glow", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "sector", radius: { data: "reach", fallback: 3.2 }, innerRadius: { data: "reach", fallback: 3.2 }, angleDegrees: { data: "arc", fallback: 120 } },
                    orient: "heading", fit: "world",
                    burst: { count: 8, interval: 3, repeats: 2 },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: [7, 14], size: [0.1, 0.02],
                    color: 0xFFD873, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "blade", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.32 } },
                    direction: "outward", speed: [0.07, 0.24], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEFFFC0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "hit_grit", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "blade", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.34 } },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_motes", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "blade", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_solarblade", 1, SolarBladeDefinition);
