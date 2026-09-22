/**
 * 鼓击 / drumbeating 的客户端表现。
 *
 * 一句话：抬手落槌敲响鼓，音粒与草屑在身前收拢；每一拍都有一道草绿根须的波峰沿地面冲向目标，在它脚下破土，
 * 末拍根须缠上腿脚、留在地里。
 * 色相家族：草绿（0x7CB342 与 0x5C9E2E）与土黄为底，末拍的根近白偏黄，无第二色相。
 * 拍子：起 tune（聚音）→ 奏 wave（波峰贴地）→ 击 strike（破土，每拍一下）→ 缠 bind（末拍缠腿）→ 收 root（根须存续）。
 * 范围：strike／bind 的环按 `data.scale`（破土半径 / 1.1）铺开，就是根须破土波及的地面范围。
 * 运动：波峰沿 `data.path`（施法者脚下 → 目标脚下，与判定同一条线）贴地跑，音粒沿鼓面向上，破土时根须向上窜。
 * 数：wave／strike 的草屑与音粒数绑定 `data.notes`（物攻与等级换算），bind 的根须束绑定 `data.cells`（根块数），
 *   强度绑定 `data.intensity`（本拍威力 / 50），`data.beat` 与 `data.beats` 让拍子进度可读。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DrumbeatingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tune: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "drum", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14], spin: 40,
                    lifetime: [8, 16], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x9CCC65, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "soil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x9C8250, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        wave: {
            emitters: [
                {
                    name: "crest", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "polyline" }, rate: { data: "notes", fallback: 12 },
                    direction: "shape", speed: [0.03, 0.12], spread: 16,
                    spin: 50, lifetime: [6, 12], size: [0.18, 0.05], sizeMode: "index",
                    color: 0x7CB342, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "dirt", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" }, rate: { data: "notes", fallback: 12 },
                    direction: "shape", speed: [0.02, 0.08], gravity: 0.03, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 100
                },
                {
                    name: "beat_note", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "up", speed: [0.08, 0.24],
                    spin: 60, lifetime: [8, 16], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x9CCC65, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.1, 0.3], gravity: 0.05, drag: 0.9,
                    spin: 40, lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x7CB342, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE8FFD0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 46
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.28, 0.5],
                    color: 0x7CB342, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        bind: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "roots", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/tochukaso",
                    burst: { count: { data: "cells", fallback: 6 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1.1 } },
                    direction: "up", speed: [0.12, 0.34], gravity: 0.06, drag: 0.9,
                    spin: 20, lifetime: [10, 20], size: [0.25, 0.06], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.95, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grip_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.6],
                    color: 0x9CCC65, alpha: [0.7, 0], light: "full", bloom: 0.2
                }
            ]
        },
        root: {
            duration: { data: "tick", fallback: 80 },
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "hold", bind: "target", offset: [0, 0.14, 0], height: 0.14,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout", spriteFrom: "random",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 32], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0x5C9E2E, alpha: [0.75, 0.1], light: "world", maxParticles: 18
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.9, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 1, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0x9CCC65, alpha: [0.4, 0], light: "full", maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "loose", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "notes", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x9C8250, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drumbeating", 1, DrumbeatingDefinition);
