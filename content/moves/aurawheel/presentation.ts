/**
 * 气场轮的表现：
 * 「施法者把颊囊能量聚成一只轮子贴地滚出，卷起草屑与电花；命中后脚下升起提速的环。」
 *
 * 色相家族：贴图取白/浅灰，实际色相由服务端按形态算出的 data.tint 乘出——电为黄、恶为暗。
 * 拍子：蓄力 spin → 滚动 roll（拉出地面尾迹）→ 命中的爆发 → 提速的上升环。
 * 范围：roll 沿身体运动在地面拉线，strike 的点爆半径与 boost 的环读出作用范围。
 * 数：命中碎片数量由服务端按最终威力算出的 data.count 决定。
 */
const AuraWheelDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 蓄力：轮子在脚边成形并转动。
        spin: {
            duration: 30,
            exit: { stop: 22, drain: 20 },
            emitters: [
                {
                    name: "wheel_ring", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "shape", speed: [0.0, 0.02], spin: 25,
                    lifetime: [10, 16], size: [0.4, 0.55],
                    color: 0xFFFFFF, alpha: [0.6, 0.1], light: "full", maxParticles: 40
                },
                {
                    name: "wheel_glow", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 10, interval: 5, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        // 滚动：贴地滚出，身后留下草屑与轮影。
        roll: {
            emitters: [
                {
                    name: "roll_dust", bind: "source", height: 0.05, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.2 }, rate: 30,
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x808080, alpha: [0.5, 0], gravity: 0.02, drag: 0.95,
                    light: "world", maxParticles: 160
                },
                {
                    name: "roll_wheel", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/drill",
                    trail: { minDistance: 0.25 }, rate: 20,
                    direction: "velocity", speed: [0.0, 0.03], spin: 40,
                    lifetime: [6, 10], size: [0.4, 0.2],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "roll_ring", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    trail: { minDistance: 0.35 }, rate: 12,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [8, 12], size: [0.5, 0.3],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        // 命中：轮子撞上的爆发。
        strike: {
            duration: 24,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "strike_flash", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 28 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [8, 14], size: [0.5, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "strike_glints", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 28 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.15, 0.45], spread: 24,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", maxParticles: 140
                },
                {
                    name: "strike_ring", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 16], size: [0.5, 1.0],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        // 提速：脚下升起一圈上升环。
        boost: {
            duration: 28,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "boost_ring", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 2, interval: 5 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.4, 1.0],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "boost_motes", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aurawheel", 1, AuraWheelDefinition);
