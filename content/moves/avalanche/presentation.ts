/**
 * 雪崩 / avalanche 的客户端表现。
 *
 * 一句话：施法者头顶拢起一团雪与冰屑（挨得越多拢得越大），随后慢而重地向前滚碾，撞上时原地崩开一圈
 *   冰爆与震荡环，把附近的人一起推开，落点地面留下一片会自己化掉的积雪。
 * 色相家族：冰青（impact_ice、iceshard、icy_snow）为主，近白（powdered_snow、groundquake 环）作衬；无第二个色相。
 * 拍子：起 gather 0–32t ／ 滚 roll 0–30t ／ 崩 crash 0–34t ／ 留 frost（随地形存留）／ 空 miss。
 * 范围：crash 的地环半径绑 `data.scale`（震荡半径派生），玩家一眼看出站哪会被崩到；
 *   frost 的地面雪层位置与存留由服务端按同一半径租借。
 * 运动：gather 的雪由外向内收并上浮；roll 贴地前碾、冰屑沿 `data.direction` 前抛；crash 由内向外炸、受重力落下；frost 低速贴地飘。
 * 数：`data.shards`（物攻与积伤派生的冰屑数）驱动各段发射量；`data.stacks`（积伤层数）放大 gather 的雪量与崩开规模；
 *   `data.intensity`（最终威力派生）抬高崩开的亮度与尺寸。
 */
const AvalancheDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "heap", bind: "source", offset: [0, 1.0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "shards", fallback: 18 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.14], spread: 24,
                    lifetime: [10, 20], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xBFE6F5, alpha: [0.85, 0], light: "full", maxParticles: 110
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.8, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: { data: "shards", fallback: 14 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.10, 0.02],
                    color: 0xE4F4FB, alpha: [0.9, 0], light: "full", maxParticles: 90
                }
            ]
        },
        roll: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "mass", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "shards", fallback: 20 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.12], spread: 20,
                    gravity: 0.01,
                    lifetime: [10, 18], size: [0.24, 0.05],
                    color: 0xCFEAF5, alpha: [0.8, 0], light: "full", maxParticles: 140
                },
                {
                    name: "shards", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 16 }, interval: 2, repeats: 6 },
                    shape: { kind: "line", length: 0.8 }, orient: "direction",
                    direction: "shape", speed: [0.08, 0.26], spread: 20,
                    gravity: 0.04,
                    lifetime: [8, 15], size: [0.14, 0.02], sizeMode: "index",
                    color: 0x8FD8F0, alpha: [0.9, 0], light: "full", maxParticles: 140
                }
            ]
        },
        crash: {
            duration: 34,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.10, 0.34],
                    lifetime: [8, 15], size: [0.42, 0.05], sizeMode: "index",
                    color: 0x9CE0F5, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.16, 0.5], spread: 28,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x7FD7F0, alpha: [0.95, 0], light: "full", maxParticles: 180
                },
                {
                    name: "snow", bind: "target", offset: [0, -0.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.14],
                    gravity: 0.02,
                    lifetime: [12, 24], size: [0.26, 0.05],
                    color: 0xEAF7FC, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "quake", bind: "target", offset: [0, -0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.2 } },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [12, 20], size: [0.7, 0.24],
                    color: 0xBFE6F5, alpha: [0.7, 0], light: "world"
                }
            ]
        },
        frost: {
            duration: 0,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "snowcap", bind: "point", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 6, shape: { kind: "circle", radius: { data: "scale", fallback: 1.0 }, thickness: 0.7 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xE4F4FB, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "melt", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 4, shape: { kind: "circle", radius: { data: "scale", fallback: 1.0 }, thickness: 0.6 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 30], size: [0.06, 0.01],
                    color: 0xCFEAF5, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slump", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xD8EEF6, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_avalanche", 1, AvalancheDefinition);
