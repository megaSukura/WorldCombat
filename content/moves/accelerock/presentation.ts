/**
 * 冲岩 / accelerock 的客户端表现。
 *
 * 一句话：碎岩先拢上施法者的身子，随后他贴地整个撞出去，身后拖一道石屑；撞实的地方炸开一片碎石，
 *   落点地面再崩出一圈碎石疤，随后慢慢平复。
 * 色相家族：土黄与灰褐（0x9A8A6A / 0x6B5B45），近白尘土（0xD8CCB8）只给撞击核心；没有第二组饱和色。
 * 拍子：起 gather（拢石）→ 冲 charge（石身推进）→ 击 smash（碎石迸溅）→ 收 scar（地面碎石疤）／空 miss（冲空扬尘）。
 * 范围：smash 的迸溅半径与碎石疤半径由 `data.scar` 与 `data.scale` 给出，玩家看出这一记崩开多大一块地面。
 * 运动：charge 绑身体、沿冲刺方向拖尾；smash 的碎石从落点向外炸开、有重力；scar 是贴地的一圈碎石。
 * 数：smash 与 charge 的碎石数量绑定 `data.shards`（速度／体重换算），亮度绑定 `data.intensity`（撞击威力换算），
 *   碎石疤的格数绑定 `data.cells`（落点实际崩出的格子数）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AccelerockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "crust", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 10, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x9A8A6A, alpha: [0.85, 0], light: "world", maxParticles: 26
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 9], size: [0.12, 0.02],
                    color: 0xD8CCB8, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 0,
            exit: { stop: 0, drain: 8 },
            emitters: [
                {
                    name: "body", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: 60, shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x8A7A5A, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "speed", bind: "source", offset: [0, 0.45, 0], height: 0.45, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 18, shape: { kind: "line", length: 0.7 },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [4, 8], size: [0.16, 0.03],
                    color: 0xD8CCB8, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        smash: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xC8B89A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "chunk", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.3], spread: 40, gravity: 0.045, drag: 0.98,
                    lifetime: [10, 18], size: [0.16, 0.05], sizeMode: "index",
                    color: 0x9A8A6A, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "puff", fallback: 10 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "scar", fallback: 1.0 } },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.3, 0.06], sizeMode: "sin",
                    color: 0x6B5B45, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        scar: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rubble", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "cells", fallback: 2 }, at: 0 },
                    shape: { kind: "ring", radius: { data: "scar", fallback: 1.0 } },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0x8A7A5A, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "cells", fallback: 2 }, at: 2 },
                    shape: { kind: "ring", radius: { data: "scar", fallback: 1.0 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0xD8CCB8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "skid", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0x6B5B45, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_accelerock", 1, AccelerockDefinition);
