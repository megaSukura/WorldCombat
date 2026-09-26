/**
 * 自然之恩 / naturalgift —— 客户端表现。
 *
 * 一句话：一缕树果色的光顺着手臂/嘴边聚起、真实果肉（种子）被嚼碎着往嘴里汇、越嚼越亮 → 施法者带着这口
 * 元素踏前一步，身后拖一条同色的短痕 → 命中处迸出果屑、果肉与种子、炸开一圈元素光环（颜色即那颗果的属性色，
 * 配合浮出的属性名）→ 落空或撞墙处只剩一小撮扬尘。踏击只结算一记。
 * 色相家族：树果属性色（data.tint）为唯一主色，细节用近白，尘屑留中性。
 * 数量由服务端算出的机制值驱动：咀嚼光点与果肉 = data.motes，命中果屑 = data.bursts，种子 = data.seeds，
 * 光环直径 = data.scale。体型由引擎的 body fit 处理。
 * 拍子：嚼（chew）→ 踏（step）→ 击（impact）／空（fizzle）。
 */
const NaturalGiftDefinition: ParticleDefinition = {
    moments: {
        chew: {
            duration: 44,
            exit: { stop: 34, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.9, 0], light: "full", maxParticles: 48
                },
                {
                    name: "sap", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "flesh", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.07], spin: 8,
                    lifetime: [7, 13], size: [0.11, 0.02],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.95, 0], light: "full", maxParticles: 60
                }
            ]
        },
        step: {
            duration: 24,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "streak", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 60, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.03, 0.10],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 34,
            exit: { stop: 8, drain: 28 },
            emitters: [
                {
                    name: "chunks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.30], gravity: 0.03, spin: 10,
                    lifetime: [10, 22], size: [0.18, 0.03],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [1, 0], light: "full", maxParticles: 120
                },
                {
                    name: "shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "bursts", fallback: 12 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.10, 0.26], gravity: 0.02, spin: 12,
                    lifetime: [8, 18], size: [0.13, 0.02],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 10, size: [0.4, 0.06], sizeMode: "index",
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.5, 0.18],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 12 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.015,
                    lifetime: [12, 24], size: [0.05, 0.01],
                    color: 0xF0F6FF, alpha: [0.55, 0], light: "world", maxParticles: 120
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.10], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0x9ED47A }, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_naturalgift", 1, NaturalGiftDefinition);
