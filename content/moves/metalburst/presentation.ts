/**
 * 金属爆炸 / metalburst 的客户端表现。
 *
 * 一句话：施法者体表泛起金属应力纹、火星沿壳乱窜（账越大越密）→ 从体内向外炸开一圈钢色冲击与碎片，
 * 账主正面挨满、周围的人各吃到一份溅射；没有账时外壳只空响一声、冒几缕灰。
 * 色相家族：钢灰与金黄（impact_steel / scalingshaded / largering / glowingsparkle_yellow），落空时降为灰。
 * 拍子：起 brace（聚应力）→ 击 burst（爆炸）→ 溢 splash（旁人吃溅射）／空 whiff。
 * 范围：burst 的冲击环与碎片半径由 `data.scale`（爆炸半径派生）给出——玩家一眼看出站多近会被炸到。
 * 运动：brace 的火星贴着体表乱窜；burst 的碎片由内向外炸、环贴地平推。
 * 数：`data.gather`（账本伤害派生）决定聚应力粒子量，`data.count`（返还伤害派生）决定冲击碎片数量。
 */
const MetalburstDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "stress", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "gather", fallback: 16 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.1], spread: 30,
                    lifetime: [7, 13], size: [0.15, 0.03], sizeMode: "sin",
                    color: 0xC9B15A, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 60,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFE39A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.1, 0.34],
                    lifetime: [7, 14], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE3CD7A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.18, 0.5], spread: 20,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x9A9A9A, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.2],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0xB8A24E, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "chips", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xC9B15A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "clank", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0xB0B0B0, alpha: [0.7, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "source", offset: [0, 0, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.05],
                    color: 0x8A8A8A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_metalburst", 1, MetalburstDefinition);
