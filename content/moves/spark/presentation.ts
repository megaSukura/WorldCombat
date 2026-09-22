/**
 * 电光 / spark 的客户端表现。
 *
 * 一句话：电花从全身窜起、向内收拢，随后整个人裹着电一个箭步贴上去；撞实的一刻在贴身处炸开一小团蓝白电花，
 * 电流往对方身上缠住不放；冲空则电在脚下泄掉。
 * 色相家族：电黄（0xFFE96A）与冷白（0xEAF6FF），电弧的蓝（0x5AC8F0）只在命中核心一点。
 * 拍子：起 charge（收电）→ 突 dash（带电短冲）→ 行 wake（残电）→ 击 zap（命中电花）→ 空 fizzle（冲空泄放）。
 * 范围：dash 的冲刺线沿 `data.path` 两顶点铺成一条短电带（横向按 `data.scale` 缩放），画的就是这一个箭步的范围。
 * 运动：电花沿身体向内收拢、再随冲刺向后甩；命中后电流在目标身上缠一圈。
 * 数：`data.arcs`（速度派生）决定电花与命中电弧的数量，`data.intensity`（本次伤害派生）决定命中强度，
 * `data.finisher`（1 表示目标残血、吃收尾加成）决定命中是否再多一圈白热爆闪，`data.overcharge`（1 表示蓄电式）决定起手足不足。
 */
const SparkDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 }, direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.16, 0.03],
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "pop", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.5 }, direction: "inward", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 36
                }
            ]
        },
        dash: {
            duration: 30,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "arcs", fallback: 8 }, speed: [0.03, 0.12], spread: 22,
                    lifetime: [5, 10], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.65, 0], light: "full", maxParticles: 120
                },
                {
                    name: "body", bind: "source", offset: [0, 0.5, 0], height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 30, shape: { kind: "box", size: [0.3, 0.28, 0.3] }, direction: "shape",
                    speed: [0.04, 0.14], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.16, 0.04],
                    color: 0xFFE96A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.26, 0.2, 0.26] }, direction: "shape",
                    speed: [0.02, 0.1], trail: { minDistance: 0.24 },
                    lifetime: [5, 8], size: [0.14, 0.04],
                    color: 0xEAF6FF, alpha: [0.55, 0], light: "full", maxParticles: 90
                }
            ]
        },
        wake: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "static", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 8, shape: { kind: "ring", radius: 0.3 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0xFFE96A, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 26
                }
            ]
        },
        zap: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 8 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFE96A, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "cling", bind: "target", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.4 }, direction: "outward",
                    speed: [0.08, 0.24], spin: 12, lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x5AC8F0, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "finish", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "finisher", fallback: 0 }, repeats: 12, interval: 1 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.22, 0.03],
                    color: 0xEAF6FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "vent", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 8 } },
                    shape: { kind: "hemisphere", radius: 0.42, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.22], spread: 16,
                    lifetime: [7, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.42 }, direction: "outward",
                    speed: [0.06, 0.18], lifetime: [9, 15], size: [0.28, 0.06],
                    color: 0xEAF6FF, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spark", 1, SparkDefinition);
