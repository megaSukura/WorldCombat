/**
 * 怪力 / strength 的客户端表现。
 *
 * 一句话：把全身力气压进一记正面直拳——拳头沿一条直线砸到目标身上，正面炸开一圈偏白的冲击，
 * 若把人拍在墙上，墙前再迸一撮碎石。
 * 色相家族：暖白（0xF5E8CC）与土黄（0xC9A06A）；饱和只出现在冲击核心的小面积。
 * 拍子：起 windup（沉腰聚势）→ 击 punch（直线出拳的速度线）→ impact（命中峰值）→ slam（撞墙）／ miss（落空）。
 * 范围：punch 的速度线与拳面沿 `data.path`（施法者→命中点）画；impact/slam 绑命中点，画的就是受力所在。
 * 运动：速度线沿出拳方向直线掠过；命中后尘土沿出拳方向退去；撞墙时石屑从墙前向后迸开。
 * 数：`data.hits`（本次威力派生）决定冲击爆发数，`data.intensity`（威力 / 60）抬高密度与亮度，
 * `data.scale`（判定半径 / 0.34）放大拳面与尘环；`data.path` 用同一组世界顶点。
 */
const StrengthDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC9A06A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0xF5E8CC, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        },
        punch: {
            duration: 18,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, rate: 48,
                    direction: "shape", speed: [0.06, 0.22], spread: 8,
                    lifetime: [5, 9], size: [0.2, 0.05],
                    color: 0xF5E8CC, alpha: [0.72, 0], light: "full", maxParticles: 220
                },
                {
                    name: "fist", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [7, 11], size: [0.42, 0.1], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 8
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hits", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.24], spread: 12,
                    lifetime: [7, 13], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "dust", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.1, 0.26], spread: 10,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xC9A06A, alpha: [0.6, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 100
                }
            ]
        },
        slam: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wall_hit", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 16,
                    lifetime: [8, 14], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xE8E0CF, alpha: [1, 0], light: "world", bloom: 0.3
                },
                {
                    name: "grit", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 40 },
                    shape: { kind: "hemisphere", radius: 0.42, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.08, 0.28],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xBFA97A, alpha: [0.75, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 120
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.34, 0.08],
                    color: 0xCFC7BC, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.2, 0.06],
                    color: 0x6E6A64, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_strength", 1, StrengthDefinition);
