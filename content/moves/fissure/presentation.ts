/**
 * 地裂 / fissure 的客户端表现。
 *
 * 一句话：施法者蹲身把震荡压进土里，一道裂缝从脚下沿地表直窜到目标点、在那里张开一个坑；掉进去的人
 * 被土尘吞没，之后那道裂缝与碎土留在地上慢慢平息。
 * 色相家族：土黄与灰岩（0x8D6E3A / 0x6E5A44 / 0xA08C6E）为主体，近白（0xE8DFC8）只给张口那一下的核心。
 * 拍子：起（windup 碎屑聚拢）→ 裂（mark 裂缝线路与预览坑，持续 `mark` 刻）→ 击（break 张口吞没 / miss 空响）→ 收（rent 裂缝余烬）。
 * 范围：`mark` 与 `break` 的地面环以固定参考半径书写、由服务端 `data.scale = 实际落点半径 / 1.7` 放大，
 *   玩家看到的那个坑就是掉下去的范围。
 * 运动：裂缝沿 `data.path` 的顶点（施法者→落点）贴合地表窜过去，碎屑在张口一刻向上崩、余烬从缝里缓缓上浮。
 * 数：`data.spall`（物攻派生）决定碎屑与崩土的密度，`data.cells`（裂缝块数）决定余烬密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FissureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "stomp", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.4, 0.7], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.5, 0], light: "world", maxParticles: 6
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 24 },
            emitters: [
                {
                    name: "seam", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, rate: { data: "spall", fallback: 20 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 18], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.55, 0], light: "world", maxParticles: 140
                },
                {
                    name: "pit", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "spall", fallback: 24 }, shape: { kind: "ring", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.04], spread: 8,
                    lifetime: [8, 14], size: [0.4, 0.66], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "pre_core", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 3, repeats: 3, interval: 6, at: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xE8DFC8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        break: {
            duration: 32,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "spall", fallback: 24 }, at: 1 },
                    shape: { kind: "circle", radius: 1.7, thickness: 0.9 },
                    direction: "up", speed: [0.12, 0.5], spread: 18,
                    gravity: 0.06, drag: 0.93,
                    lifetime: [14, 26], size: [0.13, 0.03],
                    color: 0x8A7A62, alpha: [0.9, 0], light: "world", maxParticles: 180
                },
                {
                    name: "slabs", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "spall", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "outward", speed: [0.15, 0.6], spread: 30,
                    gravity: 0.09, drag: 0.95,
                    lifetime: [16, 30], size: [0.26, 0.05],
                    color: 0x9A8A72, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "spall", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.44, 0.07], sizeMode: "index",
                    color: 0xE8DFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "front", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "spall", fallback: 50 }, shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.03, 0.12], spread: 8,
                    lifetime: [10, 18], size: [0.6, 1.0], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.7, 0], light: "world", maxParticles: 160
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        rent: {
            duration: 40,
            exit: { stop: 14, drain: 26 },
            emitters: [
                {
                    name: "seam_dust", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, rate: { data: "cells", fallback: 22 },
                    direction: "up", speed: [0.01, 0.04], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [18, 32], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.3, 0], light: "world", maxParticles: 120
                },
                {
                    name: "fume", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "cells", fallback: 14 }, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.01, 0.04], spread: 10,
                    lifetime: [24, 44], size: [0.3, 0.7], sizeMode: "linear",
                    color: 0x7A6A55, alpha: [0.22, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fissure", 1, FissureDefinition);
