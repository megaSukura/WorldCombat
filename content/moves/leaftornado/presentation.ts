/**
 * 青草搅拌器 / leaftornado 的客户端表现。
 *
 * 一句话：一圈锋利的叶片在目标脚下立起、绕着它旋转切割，叶屑被卷到脸上，几秒后四散。
 * 色相家族：黄绿（0x7CC24E）到嫩绿（0xA8D86A），叶屑收在近白的浅黄绿。
 * 拍子：起 gather（叶片从脚边升起）→ 击 spin（旋风成立持续切割）与 cut（每拍命中）→ 收 disperse（叶片四散）。
 * 范围：spin 的旋风环、地面环与叶片生成环都用 `data.radius`（机制半径）画，玩家看到环就知道旋风罩多大。
 * 运动：叶片绕落点旋转翻卷（spin + 环状生成），被切中的目标身上向外迸叶屑。
 * 数：叶片生成率绑定 `data.flow`（半径换算），每拍叶片数绑定 `data.blades`（特攻与等级换算），
 *     致盲那一下额外的叶屑数绑定 `data.flecks`（由 blades 派生），强度绑定 `data.intensity`（每拍威力 / 15）。
 */
const LeaftornadoDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "rise", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 16, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.14], spin: 18,
                    lifetime: [8, 15], size: [0.14, 0.05],
                    color: 0x7CC24E, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "updraft", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xA8D86A, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        },
        spin: {
            duration: 0,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "churn", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 60 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "shape", speed: [0.05, 0.16], spin: 24,
                    lifetime: [14, 26], size: [0.36, 0.14],
                    color: 0x8CC85A, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 160
                },
                {
                    name: "blades", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "blades", fallback: 12 }, interval: 5, repeats: 9 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "shape", speed: [0.08, 0.28], spin: 32,
                    gravity: 0.002, drag: 0.97,
                    lifetime: [10, 20], size: [0.16, 0.04],
                    color: 0x7CC24E, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "edge", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 8, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [16, 28], size: [0.5, 1.3], sizeMode: "sin",
                    color: 0x7CC24E, alpha: [0.22, 0], light: "world", render: "translucent", maxParticles: 40
                },
                {
                    name: "ground_leaves", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.02, 0.07], spin: 14,
                    gravity: 0.02, drag: 0.95,
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xA8D86A, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "slash", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 1 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xA8D86A, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "leaf_burst", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "blades", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.12, 0.32], spread: 26, spin: 26,
                    gravity: 0.025, drag: 0.92,
                    lifetime: [9, 17], size: [0.13, 0.02],
                    color: 0x7CC24E, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "blind_flecks", bind: "target", offset: [0, 0.85, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "flecks", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30, spin: 22,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xE8F0B0, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "cut_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.3, 0.7],
                    color: 0x7CC24E, alpha: [0.5, 0], light: "full"
                }
            ]
        },
        disperse: {
            duration: 30,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "scatter", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.16, 0.42], spread: 30, spin: 30,
                    gravity: 0.035, drag: 0.9,
                    lifetime: [18, 34], size: [0.15, 0.03],
                    color: 0x7CC24E, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "settle_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.4, 1.0], sizeMode: "sin",
                    color: 0x8CC85A, alpha: [0.4, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leaftornado", 1, LeaftornadoDefinition);
