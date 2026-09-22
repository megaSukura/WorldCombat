/**
 * 追打的表现：
 * 「施法者贴地扑向正在撤离的目标，身后拖出暗紫尾迹与尘土；命中处按是否追击炸开暗色碎片。」
 *
 * 色相家族：暗紫到近黑，白核作强调。起手沉降 → 扑击拉尾 → 命中两档（strike / catch）。
 * 范围：lunge 沿身体运动拉线，strike/catch 的点爆半径由环形发射器读出。
 * 数：命中碎片数量由服务端按最终威力算出的 data.count 决定，翻倍时更多。
 */
const PursuitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起手：贴地蓄势，脚下压出一圈尘。
        lunge: {
            emitters: [
                {
                    name: "crouch_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x555555, alpha: [0.5, 0], gravity: 0.02, drag: 0.95,
                    light: "world", maxParticles: 60
                },
                {
                    name: "speedlines", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, direction: "velocity", speed: [0.0, 0.05],
                    lifetime: [8, 12], size: [0.3, 0.05],
                    color: 0x8A6AD0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "streak", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    trail: { minDistance: 0.25 }, rate: 24,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 10], size: [0.2, 0.04],
                    color: 0xB080FF, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        // 命中：普通一扑。
        strike: {
            duration: 22,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "strike_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x9B7AD0, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "strike_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0x6A4AB0, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        // 命中（追击）：目标背身，碎片更密、更亮。
        catch: {
            duration: 26,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "catch_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.1, 0.3],
                    lifetime: [8, 15], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xC11BFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "catch_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.15, 0.4], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD8A0FF, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "catch_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.06, 0.1],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0x8A3AD0, alpha: [0.7, 0], light: "full"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pursuit", 1, PursuitDefinition);
