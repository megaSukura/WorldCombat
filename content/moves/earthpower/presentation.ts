/**
 * 大地之力 / earthpower —— 客户端表现。
 *
 * 一句话：选定的地面亮起一圈固定记号 → 那一点的地面自下而上崩开、一柱土尘按真实上顶高度窜起、外缘一圈震波
 * 贴着地面扫开 → 被顶起的敌人身上炸开尘土，地面留下一小片裂开的土石。
 * 色相家族：土黄与灰岩（earth / large_rock / tinydust / groundquake / impact_ground）为主体，
 * 淡黄高光（0xEDE0C0）只给崩开那一下。
 * 拍子：起 mark（亮记号）→ 击 erupt（崩开）→ hit（逐个顶起）→ 收 rupture（裂痕）／miss（落空前轻响）。
 * 范围：mark 与 erupt 的地面圈按服务端传的 `data.radius`（真实爆发半径）画在同一锁定点上，玩家看到的圈就是会被掀到的地。
 * 运动：土石块从地面向上崩起再落下，震波环贴地向外扫；柱子高度读 `data.column`（由真实 `launch` 换算）。
 * 数：`data.shards`（特攻与等级换算）决定崩起与飞石数量，`data.cells`（`terrainResult` 实际裂开块数）决定裂痕余尘。
 */
const EarthPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 18,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 22, shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 8,
                    lifetime: [8, 16], size: [0.16, 0.32],
                    color: 0xA87B3A, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "mark_dust", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 } },
                    direction: "up", speed: [0.02, 0.09], spread: 12,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A6A44, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        erupt: {
            duration: 30,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "erupt_columns", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 } },
                    direction: "up", speed: [0.25, 0.75], spread: 20,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0xA87B3A, alpha: [0.95, 0], light: "world", maxParticles: 160
                },
                {
                    name: "erupt_rocks", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "cells", fallback: 10 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 }, thickness: 0.85 },
                    direction: "up", speed: [0.3, 0.85], spread: 28,
                    gravity: 0.09, drag: 0.95,
                    lifetime: [16, 30], size: [0.28, 0.06],
                    color: 0x8A6A44, alpha: [0.9, 0], light: "world", maxParticles: 100
                },
                {
                    name: "erupt_front", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 44, shape: { kind: "ring", radius: { data: "radius", fallback: 1.7 } },
                    direction: "outward", speed: [0.03, 0.12], spread: 8,
                    lifetime: [10, 18], size: [0.4, 0.8],
                    color: 0xA87B3A, alpha: [0.75, 0], light: "world", maxParticles: 120
                },
                {
                    name: "erupt_core", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: 9, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xEDE0C0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "erupt_column", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "line", length: { data: "column", fallback: 1.4 } },
                    rate: 34, direction: "up", speed: [0.12, 0.4], spread: 12,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xA87B3A, alpha: [0.85, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.25], spread: 18,
                    lifetime: 8, size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEDE0C0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "hit_clods", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.08, drag: 0.94,
                    lifetime: [12, 24], size: [0.12, 0.02],
                    color: 0x8A6A44, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "hit_column", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "line", length: { data: "column", fallback: 1.4 } },
                    rate: 18, direction: "up", speed: [0.08, 0.26], spread: 16,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [6, 14], size: [0.1, 0.02],
                    color: 0x6E5233, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        rupture: {
            duration: 28,
            exit: { stop: 11, drain: 22 },
            emitters: [
                {
                    name: "rupture_dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 } },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0x6E5233, alpha: [0.4, 0], light: "world", maxParticles: 100
                },
                {
                    name: "rupture_shards", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 10 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.12], spread: 22,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xA87B3A, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "miss_scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    gravity: 0.03,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A6A44, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_earthpower", 1, EarthPowerDefinition);
