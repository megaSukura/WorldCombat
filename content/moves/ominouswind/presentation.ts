/**
 * 奇异之风 / ominouswind —— 客户端表现。
 *
 * 一句话：施法者脚边卷起一圈冷雾 → 一道幽风贴着地面窜向目标、越过之处留下一线幽丝 → 到目标脚下炸开、
 * 从四面朝中心收拢成一柱暗旋 → 被罩住的敌人身上泛起冷光 → 一缕冷气倒卷回施法者并炸起一圈亮丝。
 * 色相家族：幽蓝与灰紫（swirlingwind / smoke / smokeorb 为主体，0x9BA8C8、0x6E7A99），冷白高光（0xC9D3E8）
 * 只给收拢那一下与反哺。
 * 拍子：起 gather（冷雾聚拢）→ 奔 travel（一线幽丝）→ 收 coil（暗旋炸开）→ hit（逐个凛住）→ 涌 surge／空 miss。
 * 范围：coil 的暗旋与环按服务端传的 `data.radius`（真实收拢半径）画出，玩家看到的圈就是会被收拢的地。
 * 运动：幽丝沿 `data.path` 的顶点（施法者一路留下的实际航迹）连成一线；收拢时幽丝从圈外朝中心收；
 *   撞墙提前收风时，额外的 scatter 拍在墙面散开。
 * 数：`data.wisps`（特攻与等级换算）决定卷起的幽丝量，`data.intensity` 缩放发射量。
 */
const OminousWindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_mist", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 18, shape: { kind: "circle", radius: 1.0 },
                    direction: "inward", speed: [0.02, 0.08], spread: 10,
                    lifetime: [10, 20], size: [0.24, 0.04],
                    color: 0x6E7A99, alpha: [0.4, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather_wisp", bind: "source", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 10, shape: { kind: "sphere", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.1], spread: 14, spin: 12,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0x9BA8C8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        travel: {
            duration: 20,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "travel_line", bind: "path", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 40, shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0.02, 0.12], spread: 16, spin: 16,
                    lifetime: [8, 16], size: [0.26, 0.05],
                    color: 0x9BA8C8, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "travel_mist", bind: "path", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 22, shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0.01, 0.06], spread: 12,
                    lifetime: [10, 18], size: [0.2, 0.03],
                    color: 0x6E7A99, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        scatter: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "scatter_wind", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "wisps", fallback: 12 }, at: 1 },
                    shape: { kind: "hemisphere", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.05, 0.22], spread: 26, spin: 18,
                    lifetime: [8, 16], size: [0.24, 0.04],
                    color: 0x9BA8C8, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "scatter_smoke", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 16,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x6E7A99, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        coil: {
            duration: 28,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "coil_vortex", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "wisps", fallback: 20 }, at: 1 },
                    shape: { kind: "torus", radius: { data: "radius", fallback: 2.0 }, thickness: 0.5 },
                    direction: "inward", speed: [0.05, 0.25], spread: 22, spin: 20,
                    lifetime: [12, 24], size: [0.3, 0.05],
                    color: 0x9BA8C8, alpha: [0.85, 0], light: "world", maxParticles: 140
                },
                {
                    name: "coil_ring", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 34, shape: { kind: "ring", radius: { data: "radius", fallback: 2.0 } },
                    direction: "inward", speed: [0.04, 0.16], spread: 10,
                    lifetime: [10, 18], size: [0.34, 0.7],
                    color: 0x6E7A99, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "coil_flash", bind: "point", offset: [0, 0.14, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: 9, size: [0.36, 0.06], sizeMode: "index",
                    color: 0xC9D3E8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_chill", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.24], spread: 18,
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9D3E8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "hit_smoke", bind: "target", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 24, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0x6E7A99, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "surge_wisps", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 28, shape: { kind: "cylinder", radius: 0.6, length: 1.6 },
                    direction: "up", speed: [0.05, 0.18], spread: 14, spin: 14,
                    lifetime: [12, 22], size: [0.22, 0.03],
                    color: 0xC9D3E8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 24, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.03, 0.1], spread: 8,
                    lifetime: [10, 18], size: [0.26, 0.6],
                    color: 0x9BA8C8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "miss_smoke", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.0 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x6E7A99, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ominouswind", 1, OminousWindDefinition);
