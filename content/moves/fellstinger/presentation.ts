/**
 * 致命针刺的表现：
 * 「尾针向前一扎，命中处迸出黄绿碎点；这一扎放倒目标时，施法者身上轰起攻击暴涨的上升光环。」
 *
 * 色相家族：黄绿到亮黄，强调用近白。突刺一段直线 → 命中爆点 → 可选的击倒光环。
 * 范围：thrust 沿朝向画一条短直线，sting 的点爆半径读出命中的范围。
 * 数：命中碎点数量与击倒光环数量由服务端按最终威力与提升级数算出的 data.count 决定。
 */
const FellStingerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 突刺：针尖沿目标方向拉出一条短直线。
        thrust: {
            emitters: [
                {
                    name: "spike_line", bind: "source", height: 0.5, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 16, shape: { kind: "line", length: 1.2 },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [6, 10], size: [0.22, 0.04],
                    color: 0xA8B820, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "focus", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 8, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8F060, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        // 命中：虫系黄绿爆点。
        sting: {
            duration: 22,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "sting_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xC8E050, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "venom_glints", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.15, 0.4], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xE0F080, alpha: [0.95, 0], light: "full", maxParticles: 100
                }
            ]
        },
        // 击倒：攻击提升的上升光环。
        rise: {
            duration: 30,
            exit: { stop: 18, drain: 20 },
            emitters: [
                {
                    name: "rise_core", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "count", fallback: 34 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0xFFE060, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 160
                },
                {
                    name: "rise_rings", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 4 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.3, 0.9],
                    color: 0xC8E050, alpha: [0.7, 0], light: "full"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fellstinger", 1, FellStingerDefinition);
