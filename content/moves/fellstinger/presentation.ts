/**
 * 致命针刺的表现：
 * 「起手时身前聚起一点黄绿焦点；尾针沿实际瞄准向前伸出一条两端点明确的针线，随真实推进逐刻更新；
 *   命中处迸出黄绿碎点，落空或被拒则收针；这一扎真的放倒目标时，施法者身上轰起攻击暴涨的上升光环。」
 *
 * 色相家族：黄绿到亮黄，强调用近白。起手聚光 → 前伸针线 → 命中爆点／落空收针 → 可选的击倒光环。
 * 范围：thrust 的针线走 `data.path`（身体中心到身前 traceAhead），是真几何，不是绕 Y 轴的自转线。
 * 数：命中碎点数量由服务端按最终威力算出的 data.count 决定；击倒光环数量由实际提升级数决定。
 */
const FellStingerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起手：身前聚起黄绿焦点（提交前预告）。
        windup: {
            emitters: [
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
        // 突刺：针线由 data.path 的两个真实端点撑起（身体中心 → 身前），随实际移动更新。
        thrust: {
            emitters: [
                {
                    name: "spike_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    shape: { kind: "polyline" },
                    rate: 24, direction: "shape", speed: [0.0, 0.04], spread: 8,
                    lifetime: [6, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xA8B820, alpha: [0.8, 0], light: "full", maxParticles: 40
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
        // 落空/被拒：针尖收回身边。
        retract: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "withdraw", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.05, 0.16], gravity: 0.02,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xA8B820, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // 击倒：攻击提升的上升光环（数量由实际提升级数决定）。
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
