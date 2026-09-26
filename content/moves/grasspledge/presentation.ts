/**
 * 草之誓约 / grasspledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈青绿的藤纹符文，随后一丛草叶与藤蔓从地面炸土而出把敌人缠住，柱脚只留一圈短寿的
 *   藤印（共鸣标记，本身不拖慢）；只有与火／水真正共鸣时，同一圈印才就地铺开翻涌的火海，或塌成一汪冒泡的湿地。
 * 色相家族：黄绿到深绿（sprout／leaf／razorleaf／seed／impact_grass）；火海时刻引入橙红（与火之誓约一致），
 *   湿地时刻引入土褐与青蓝（mudsplash／mudbubble／water_ripple），与三誓约的第三色相分开。
 * 拍子：起（mark 地面藤纹）→ 击（erupt 草柱 + hit 命中点，仅当这次控制真的挂上时画收拢的根叶）→ 留（scar 短印，或 seaoffire／wetland 组合场）。
 * 范围：mark／scar／seaoffire／wetland 的花环半径 = `data.scale` × 参考 1.8 格（= 实际誓约印半径）；
 *   erupt 的柱体 shape 直接绑定 `data.radius`／`data.height`，画面里的那丛柱就是实际判定柱。
 * 运动：草叶从地面向上、向外炸开，藤蔓缓慢盘旋；余韵草絮上浮；火海向外翻涌；湿地水泡从泥里冒起。
 * 数：`data.count`（由特攻与地面盘根数量派生）决定草叶、贴地盘根与组合场的粒子数量；
 *   `data.moment` 由服务端按同一印记的实际组合态选择 scar／seaoffire／wetland，`data.scale` 让范围贴合实际半径。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GrasspledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.8 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0x8FD45A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rune_leaf", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "ring", radius: 1.6 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_sprout", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.05, 0.35],
                    lifetime: [12, 22], size: [0.4, 0.06], sizeMode: "index",
                    color: 0x7FC24A, alpha: [0.85, 0], light: "world", maxParticles: 380
                },
                {
                    name: "column_leaves", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 200,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.1, 0.5],
                    lifetime: [12, 24], size: [0.22, 0.04],
                    color: 0x4E8A2A, alpha: [0.9, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 520
                },
                {
                    name: "column_seeds", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "count", fallback: 50 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.12, 0.55],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xCDE88A, alpha: [0.9, 0], gravity: 0.05, drag: 0.95, light: "world", maxParticles: 300
                },
                {
                    name: "soil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.4 } },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 18], size: [0.3, 0.05],
                    color: 0x6A4A2A, alpha: [0.7, 0], gravity: 0.03, light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "binding", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "binding", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.08, 0.35],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x8FD45A, alpha: [0.9, 0], light: "world"
                }
            ]
        },
        scar: {
            duration: 30,
            exit: { stop: 20, drain: 26 },
            emitters: [
                {
                    name: "tangle", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "count", fallback: 14 }, shape: { kind: "circle", radius: 1.8 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0x6FA83A, alpha: [0.65, 0], light: "world", maxParticles: 90
                },
                {
                    name: "creeper", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.005, 0.02],
                    lifetime: [18, 30], size: [0.12, 0.02],
                    color: 0x3F6A22, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        seaoffire: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "sea_flames", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 80, shape: { kind: "circle", radius: 1.8 },
                    direction: "shape", speed: [0.04, 0.22],
                    lifetime: [12, 22], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.8, 0], gravity: -0.008, drag: 0.95, light: "full", maxParticles: 300
                },
                {
                    name: "sea_embers", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 80 }, interval: 6, repeats: 5 },
                    shape: { kind: "circle", radius: 1.8 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD06A, alpha: [0.9, 0], gravity: 0.03, light: "full", maxParticles: 300
                },
                {
                    name: "sea_pulse", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 12, at: 0, interval: 12, repeats: 3 },
                    shape: { kind: "ring", radius: 1.8 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 22], size: [0.5, 0.14],
                    color: 0xFF6A26, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        wetland: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "mire", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 30, shape: { kind: "circle", radius: 1.8 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 30], size: [0.18, 0.03],
                    color: 0x6A5230, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "wet_pulse", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "circle", radius: 1.8 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x7FB8A8, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "reeds", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x5E8A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grasspledge", 1, GrasspledgeDefinition);
