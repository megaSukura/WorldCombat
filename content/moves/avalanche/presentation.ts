/**
 * 雪崩 / avalanche 的客户端表现。
 *
 * 一句话：身前地面拢起一堆雪（挨得越多堆得越厚），整股宽而低的雪体贴着真实地表向前滑；撞上敌人时在接触点炸开
 *   冰屑与雪雾，被墙挤住则堆成一堆、坠崖则向下散落，滑过的最后一段留一层会化掉的残雪。
 * 色相家族：冰青（impact_ice、iceshard、icy_snow）为主，近白（powdered_snow）作衬；无第二个色相。
 * 拍子：起 gather ／ 滑 front（随服务端逐刻推进的同一 key）／ 触 burst ／ 停 pile 或 fall ／ 留 frost。
 * 范围：front 的地面雪带半径绑 `data.width`（雪堆半宽），pile/fall/frost 同样；玩家一眼看出雪铺到哪。
 * 运动：gather 的雪由外向内收；front 贴地前碾并留下尾迹；burst 由内向外炸；fall 向下坠；frost 低速贴地飘。
 * 数：`data.shards`（物攻与积伤派生的冰屑数）驱动各段发射量；`data.stacks`（积伤层数）放大 gather 与停堆规模；
 *   `data.intensity`（最终威力派生）抬高触击的亮度与尺寸。
 */
const AvalancheDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "heap", bind: "point", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "shards", fallback: 18 }, shape: { kind: "sphere", radius: 0.65 },
                    direction: "inward", speed: [0.03, 0.14], spread: 24,
                    lifetime: [10, 20], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xBFE6F5, alpha: [0.85, 0], light: "full",
                    fit: "world", maxParticles: 110
                },
                {
                    name: "grit", bind: "point", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "shards", fallback: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.10, 0.02],
                    color: 0xE4F4FB, alpha: [0.9, 0], light: "full",
                    fit: "world", maxParticles: 90
                }
            ]
        },
        front: {
            duration: 0,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "mass", bind: "point", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "shards", fallback: 20 },
                    shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.55 },
                    direction: "up", speed: [0.01, 0.06], spread: 30,
                    gravity: 0.01, trail: { minDistance: 0.28 },
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xCFEAF5, alpha: [0.8, 0], light: "world",
                    fit: "world", maxParticles: 160
                },
                {
                    name: "crest", bind: "path", offset: [0, 0.3, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "shards", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.1], spread: 18,
                    gravity: 0.02,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xE4F4FB, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "tumble", bind: "point", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 10 }, interval: 3, repeats: 4 },
                    shape: { kind: "sphere_surface", radius: { data: "width", fallback: 1.0 } },
                    direction: "outward", speed: [0.06, 0.2], spread: 26,
                    gravity: 0.05,
                    lifetime: [8, 15], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8FD8F0, alpha: [0.9, 0], light: "full",
                    fit: "world", maxParticles: 140
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.10, 0.34],
                    lifetime: [8, 15], size: [0.42, 0.05], sizeMode: "index",
                    color: 0x9CE0F5, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.16, 0.5], spread: 28,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x7FD7F0, alpha: [0.95, 0], light: "full", maxParticles: 180
                },
                {
                    name: "snow", bind: "target", offset: [0, -0.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 14 } },
                    shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.14],
                    gravity: 0.02,
                    lifetime: [12, 24], size: [0.26, 0.05],
                    color: 0xEAF7FC, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        pile: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "bank", bind: "point", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 22 } },
                    shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.6 },
                    direction: "up", speed: [0.03, 0.16], spread: 34,
                    gravity: 0.03,
                    lifetime: [12, 24], size: [0.24, 0.05],
                    color: 0xD8EEF6, alpha: [0.8, 0], light: "world",
                    fit: "world", maxParticles: 150
                },
                {
                    name: "settle", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 6, shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.7 },
                    direction: "up", speed: [0.0, 0.03],
                    lifetime: [14, 26], size: [0.10, 0.02],
                    color: 0xCFEAF5, alpha: [0.5, 0], light: "world",
                    fit: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "lay", bind: "point", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.6 },
                    direction: "up", speed: [0.02, 0.12], spread: 30,
                    gravity: 0.03,
                    lifetime: [12, 22], size: [0.22, 0.05],
                    color: 0xD8EEF6, alpha: [0.7, 0], light: "world",
                    fit: "world", maxParticles: 120
                }
            ]
        },
        fall: {
            duration: 30,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 24 } },
                    shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.5 },
                    direction: "down", speed: [0.08, 0.3], spread: 20,
                    gravity: 0.06,
                    lifetime: [14, 26], size: [0.24, 0.05],
                    color: 0xE4F4FB, alpha: [0.8, 0], light: "world",
                    fit: "world", maxParticles: 160
                },
                {
                    name: "crumbs", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "width", fallback: 1.0 } },
                    direction: "down", speed: [0.1, 0.34], spread: 24,
                    gravity: 0.08,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0x8FD8F0, alpha: [0.9, 0], light: "full",
                    fit: "world", maxParticles: 120
                }
            ]
        },
        frost: {
            duration: 0,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "cap", bind: "point", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 6, shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.7 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xE4F4FB, alpha: [0.4, 0], light: "world",
                    fit: "world", maxParticles: 40
                },
                {
                    name: "melt", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 4, shape: { kind: "circle", radius: { data: "width", fallback: 1.0 }, thickness: 0.6 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 30], size: [0.06, 0.01],
                    color: 0xCFEAF5, alpha: [0.35, 0], light: "world",
                    fit: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_avalanche", 1, AvalancheDefinition);
