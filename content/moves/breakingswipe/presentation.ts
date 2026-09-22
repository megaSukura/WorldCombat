/**
 * 广域破坏 / breakingswipe 的客户端表现。
 *
 * 一句话：施法者压身、尾巴在身后摆开 → 尾巴沿地面扫出一道靛青扇面，扇面里的尘与龙鳞被掀起、地面被犁开 →
 *   被扫到的人身上各炸开一圈龙鳞冲击（攻击下降）。
 * 色相家族：龙系的靛青（0x8A6CFF 主体、0xC9BFFF 亮面），地面尘用中性灰，击点用近白核心。
 * 拍子：起 coil 0–7t ／ 扫 sweep ／ 中 hit ／ 空 miss。
 * 范围：sweep 的扇面用服务端给的同一组顶点（`data.path`）以 polygon 填出，半径与张角`data.radius`／`data.arc`
 *   与判定一致；玩家一眼看出站在哪片扇里会被扫到。
 * 运动：coil 的尾风绕身向内收；sweep 的尘从扇心向外扫、地面碎屑被犁起后受重力落下；hit 的龙鳞从目标表面外炸。
 * 数：`data.scales`（物攻与等级派生的龙鳞数）驱动 sweep／hit 发射量，`data.cells`（犁出的地格数）决定犁痕尘量，
 *   `data.stages` 决定 hit 的压环重放，`data.intensity`（威力 / 58）抬高密度。
 */
const BreakingSwipeSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "twist", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 22, shape: { kind: "ring", radius: 0.65 },
                    direction: "inward", speed: [0.06, 0.2], spin: 22,
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0x8A6CFF, alpha: [0.55, 0], light: "full", maxParticles: 80
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        sweep: {
            duration: 40,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "area", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "scales", fallback: 16 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    lifetime: [10, 18], size: [0.28, 0.1], sizeMode: "linear",
                    color: 0x8A6CFF, alpha: [0.28, 0], light: "world", maxParticles: 220
                },
                {
                    name: "torn", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: { data: "cells", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.05, 0.22], gravity: 0.06, spin: 18,
                    lifetime: [9, 16], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xC9BFFF, alpha: [0.7, 0], light: "full", maxParticles: 160
                },
                {
                    name: "gust", bind: "source", offset: [0, 0.25, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 30, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.16, 0.42], spin: 30,
                    lifetime: [5, 11], size: [0.24, 0.06], sizeMode: "index",
                    color: 0xC9BFFF, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 28,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "scales", fallback: 16 }, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xffffff, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "shards", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "scales", fallback: 16 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.38 },
                    direction: "outward", speed: [0.14, 0.36], gravity: 0.05, spin: 20,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0x8A6CFF, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "press", bind: "target", offset: [0, 0.1, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.12, 0.3],
                    lifetime: [9, 16], size: [0.4, 0.85], sizeMode: "sin",
                    color: 0x8A6CFF, alpha: [0.55, 0], light: "full", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.16, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scales", fallback: 14 } }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.03,
                    lifetime: [10, 17], size: [0.08, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_breakingswipe", 1, BreakingSwipeSceneDefinition);
