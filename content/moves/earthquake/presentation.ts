/**
 * 地震 / earthquake 的客户端表现。
 *
 * 一句话：施法者沉身在地面按出一个将被掀开的圈，随后整片地面向上崩起、土块与碎石被抛到半空，
 * 外缘一圈震波向外扫过，最后地上留下放射状的深缝。
 * 色相家族：土黄与灰岩（earth / large_rock / tinydust / groundquake / impact_ground）为主体，
 * 近白只做掀地那一下的高光。
 * 拍子：起（stomp 沉身、地面起屑）→ 击（rupture 崩起、hit 逐处掀中、aftershock 余震）→ 收（rent 裂缝扬尘 / miss 落空）。
 * 范围：stomp 与 rupture 的地面圈按服务端传的 `data.radius`（真实波及半径）与 `data.area`（预告圈）画出，
 * 玩家看到的圈就是会被掀到的地。
 * 运动：土块从整片地面向上崩起再落回，震波环贴着地面向外扫，裂屑最后从缝里缓缓上浮。
 * 数：`data.cells`（物攻派生，等于实际裂开的块数）决定崩起与残屑的数量，`data.flow`（半径派生）决定环上密度，
 * `data.marks`（威力派生）决定掀地高光与飞石量，`data.count`（威力派生）决定命中碎屑量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const EarthquakeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stomp: {
            duration: 18,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "shiver", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 18, interval: 6, repeats: 2, at: 2 },
                    shape: { kind: "circle", radius: { data: "area", fallback: 4.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.03, 0.14], spread: 12,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0x9A8A72, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 26, shape: { kind: "ring", radius: { data: "area", fallback: 4.6 } },
                    direction: "up", speed: [0.01, 0.04], spread: 8,
                    lifetime: [10, 18], size: [0.4, 0.62], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rupture: {
            duration: 30,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "heave", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 30 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 }, thickness: 0.85 },
                    direction: "up", speed: [0.15, 0.55], spread: 16,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [14, 26], size: [0.14, 0.03],
                    color: 0x8A7A62, alpha: [0.95, 0], light: "world", maxParticles: 200
                },
                {
                    name: "slabs", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "marks", fallback: 18 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.2, 0.7], spread: 26,
                    gravity: 0.08, drag: 0.95,
                    lifetime: [16, 30], size: [0.3, 0.06],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 140
                },
                {
                    name: "front", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "flow", fallback: 80 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.6 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 8,
                    lifetime: [10, 18], size: [0.6, 1.1], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.75, 0], light: "world", maxParticles: 160
                },
                {
                    name: "core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.45, 0.07], sizeMode: "index",
                    color: 0xE8DFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "count", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "clods", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30,
                    gravity: 0.08, drag: 0.94,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        aftershock: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "heave", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.9 }, thickness: 0.85 },
                    direction: "up", speed: [0.1, 0.4], spread: 16,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 140
                },
                {
                    name: "front", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.9 } },
                    direction: "outward", speed: [0.02, 0.08], spread: 8,
                    lifetime: [8, 14], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        rent: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "scar_dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [16, 30], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.35, 0], light: "world", maxParticles: 130
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 24 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.12], spread: 22,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [14, 26], size: [0.09, 0.02],
                    color: 0x9A8A72, alpha: [0.6, 0], light: "world", maxParticles: 100
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_earthquake", 1, EarthquakeDefinition);
