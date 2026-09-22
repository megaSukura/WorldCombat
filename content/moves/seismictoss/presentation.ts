/**
 * 地球上投 / seismictoss 的客户端表现。
 *
 * 一句话：施法者站定收力，一把扣住对手（抓痕一闪），把它整个甩上一条陡弧，落地砸出一圈地裂石屑。
 * 色相家族：斗系的橙金到土黄（impact_fighting / grab / groundquake），烟尘用焦土中性色。
 * 拍子：起（brace 收力）→ 抓（seize 扣住）→ 甩（hurl 沿弧线飞）→ 击（slam 落地）。
 * 范围：slam 的地环与石屑画的就是落地冲击半径（data.scale = 实际半径 / 0.9）。
 * 运动：hurl 的尾迹钉在被甩出的对手身上，沿服务端给的初速方向跟着它飞完整条弧线。
 * 数：seize 的抓痕量与 slam 的尘石量由服务端按等级伤害与体重算好传入（data.count / data.scale）。
 */
const SeismicTossDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "plant_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xC98B3A, alpha: [0.55, 0], light: "full", maxParticles: 28
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.8, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [7, 12], size: [0.13, 0.04], sizeMode: "sin",
                    color: 0xE0A24A, alpha: [0.6, 0], light: "full", maxParticles: 32
                }
            ]
        },
        seize: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "grip", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.3, 0.05],
                    color: 0xE0A24A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "strain", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "point" }, lifetime: [5, 9], size: [0.26, 0.07],
                    color: 0xE0603A, alpha: [0.9, 0], light: "full", maxParticles: 8
                }
            ]
        },
        hurl: {
            duration: 30,
            exit: { stop: 26, drain: 10 },
            emitters: [
                {
                    name: "arc_trail", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.28 },
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xD8B888, alpha: [0.6, 0], gravity: 0.02, light: "world", maxParticles: 180
                },
                {
                    name: "spin_line", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "sphere", radius: 0.3 },
                    orient: "direction", direction: "shape", speed: [0.02, 0.06],
                    lifetime: [4, 8], size: [0.18, 0.06],
                    color: 0xE0C46A, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "ground_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "count", fallback: 24 }, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 17], size: [0.4, 0.14],
                    color: 0xB58A4A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rock_burst", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.22, 0.06], sizeMode: "index",
                    color: 0x8C7A5A, alpha: [0.85, 0], gravity: 0.04, drag: 0.9, light: "world", maxParticles: 70
                },
                {
                    name: "slam_impact", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "point" }, lifetime: [6, 11], size: [0.4, 0.1],
                    color: 0xE0B060, alpha: [1, 0], light: "full", maxParticles: 10
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.05, 0.015],
                    color: 0xB9AFA0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_seismictoss", 1, SeismicTossDefinition);
