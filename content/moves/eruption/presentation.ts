/**
 * 喷火 / eruption 的客户端表现。
 *
 * 一句话：火先被压进脚下（地面裂开暗红的光、身前一柱暗红预告）→ 一柱火从身上冲天、一圈冲击贴着地整圈炸开，
 *   圈里的人各自烧起来并被掀飞 → 火退成一地暗红余烬与灰烟慢慢灭。
 * 色相家族：火焰橙红的一族（0xFF6A2A／0xFFC24A／0xFFE2A0）为主体，黑烟（smoke）与土黄碎屑（earth）衬托；
 *   唯一近白是火柱根部的高光。
 * 拍子：压（charge）→ 喷（burst 火柱与冲击、hit 烧身）→ 烬（ash 余烬）。
 * 范围：burst 的贴地冲击环与碎屑盘按 `data.radius`（真实波及半径）铺满，画出来的就是会被喷到的那块地。
 * 运动：火柱竖直冲起，冲击环与碎屑沿地表向外扩，余烬带重力下落、只作画面不暗示持续伤。
 * 数：`data.sparks`（特攻与体重派生的迸溅量）决定火屑与灰量，`data.column`（体型派生）决定火柱高度与起手预告柱，
 *   `data.cells`（半径派生）决定碎屑与烟量，`data.count`（威力×衰减派生）决定命中火量，`data.intensity`（威力派生）整体加权。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EruptionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "charge", fallback: 14 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ground_glow", bind: "point", fit: "none", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 }, thickness: 0.55 },
                    direction: "inward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [8, 15], size: [0.09, 0.01],
                    color: 0xFF8A33, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "press_body", bind: "source", offset: [0, 0.06, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 22, shape: { kind: "cylinder", radius: 0.5, length: 0.5 },
                    direction: "down", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.22, 0.04],
                    color: 0xFFC24A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "telegraph_column", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "cylinder", radius: 0.35, length: { data: "column", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xB0402A, alpha: [0.35, 0], light: "world", maxParticles: 24
                },
                {
                    name: "heat_smoke", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [14, 24], size: [0.3, 0.5],
                    color: 0x3A2E2A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "pillar", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "sparks", fallback: 40 }, shape: { kind: "cylinder", radius: 0.5, length: { data: "column", fallback: 2.2 } },
                    direction: "up", speed: [0.12, 0.4], spread: 12,
                    lifetime: [8, 16], size: [0.28, 0.05],
                    color: 0xFF6A2A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "sparks", fallback: 30 }, shape: { kind: "cylinder", radius: 0.34, length: { data: "column", fallback: 2.2 } },
                    direction: "up", speed: [0.08, 0.3], spread: 10,
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFE2A0, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 110
                },
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.6, 1.7],
                    color: 0xFF9A40, alpha: [0.6, 0], light: "world", maxParticles: 26
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 24 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 }, thickness: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.32], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 220
                },
                {
                    name: "ember_rain", bind: "point", fit: "none", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 40 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.1, 0.4], spread: 20, gravity: 0.06, drag: 0.93,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 240
                },
                {
                    name: "fume", bind: "point", fit: "none", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "cells", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [16, 28], size: [0.4, 0.7],
                    color: 0x3A2E2A, alpha: [0.4, 0], light: "world", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "scorch", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "flame_wrap", bind: "target", offset: [0, 0.3, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 16,
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xFF7A2E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        ash: {
            duration: 28,
            exit: { drain: 22 },
            emitters: [
                {
                    name: "smoulder", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "cells", fallback: 12 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.02, 0.09], spread: 18, gravity: 0.02, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xFF6A24, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "ash_cloud", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [16, 28], size: [0.34, 0.56],
                    color: 0x2E2624, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_eruption", 1, EruptionDefinition);
