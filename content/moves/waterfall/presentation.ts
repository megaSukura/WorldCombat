/**
 * 攀瀑 / waterfall 的客户端表现。
 *
 * 一句话：水从身后涌起一道竖直水帘，装束缩身蓄势后整身扑出，拖着一路下降的水墙；撞上目标的一刻
 * 水帘拍身、目标被冲退并头顶转起愣神的环。
 * 色相家族：深水蓝（0x3E8FCB）与泡沫白（0xCFEBFF）；饱和只出现在水帘与命中的小面积。
 * 拍子：起 gather（水帘涌起）→ 扑 surge（拖行水墙）→ 击 impact（拍身）→ 收 spill（拍散）与 flinch（震懵）。
 * 范围：surge 的水帘用 `data.curtain`（机制算出的水帘高度）铺成立线，撞实的横向范围由 `data.scale`（判定半径 / 0.6）放大。
 * 运动：水帘粒子沿竖直方向下落、随施法者扑出的轨迹留在身后；命中时向外拍散。
 * 数：impact／spill 的水花点数绑定 `data.spray`（速度与物攻换算），强度绑定命中威力，雨下更大时更密。
 */
const WaterfallDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "well", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 18, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.1, 0.32],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0x3E8FCB, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "veil", bind: "source", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 14, shape: { kind: "line", length: { data: "curtain", fallback: 1.6 } },
                    direction: "down", speed: [0.12, 0.4],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xCFEBFF, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        surge: {
            emitters: [
                {
                    name: "wall", bind: "source", fit: "body", trail: { minDistance: 0.28 }, rate: { data: "spray", fallback: 24 },
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    shape: { kind: "line", length: { data: "curtain", fallback: 1.6 } },
                    direction: "down", speed: [0.1, 0.34], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [7, 13], size: [0.14, 0.02],
                    color: 0xCFEBFF, alpha: [0.75, 0], light: "world", maxParticles: 220
                },
                {
                    name: "streak", bind: "source", fit: "body", trail: { minDistance: 0.4 }, rate: 16,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    direction: "down", speed: [0.2, 0.5],
                    lifetime: [5, 9], size: [0.16, 0.03],
                    color: 0x3E8FCB, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "slam", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "wash", bind: "target", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 24 } },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.36], spread: 10,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 16], size: [0.26, 0.04],
                    color: 0x3E8FCB, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "foam", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 18 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.28], spread: 26,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xCFEBFF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        spill: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flush", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "spray", fallback: 20 } },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.28],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0xCFEBFF, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        flinch: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "stun", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.05],
                    color: 0xCFEBFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_waterfall", 1, WaterfallDefinition);
