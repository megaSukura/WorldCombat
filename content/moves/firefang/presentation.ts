/**
 * 火焰牙 / firefang 的客户端表现。
 *
 * 一句话：牙间燃起火种、火星顺牙面乱窜 → 沿一条直线扑出、脚边拖出火线 → 咬实的一刻在接触点炸开火色迸溅与獠牙剪影，
 * 随即火苗从伤口里往外冒（火种被按进肉里）；被咬懵的人头顶晃出火色星子。
 * 色相家族：火橙（0xFF7A2A）与余烬金（0xFFD08A），近白只出现在咬实峰值一点。
 * 拍子：起 charge（牙间聚火）→ 扑 pounce → 咬 bite（命中峰值）／ miss（扑空刹停）→ 灌 sear → 懵 flinch。
 * 范围：bite／sear 绑命中点，画出的就是咬中的位置与伤口；pounce 的尘迹沿施法者实际走过的直线铺开。
 * 运动：速度线沿扑出方向掠过；sear 的火苗从伤口向上冒并向外舔；flinch 的星子从目标头顶向上飘。
 * 数：`data.embers`（特攻派生）决定咬中迸溅与伤口火星的数量；`data.intensity`（威力 / 66）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.42）放大牙影与判定环。
 */
const FirefangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0xFF7A2A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 44
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.14], spread: 20,
                    lifetime: [5, 10], size: [0.09, 0.03],
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        pounce: {
            duration: 28,
            exit: { stop: 20, drain: 12 },
            emitters: [
                {
                    name: "fire_trail", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 26, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFD08A, alpha: [0.6, 0], light: "full", maxParticles: 150
                },
                {
                    name: "bite_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xFFC97A, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF1D6, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "fire_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "shreds", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xFF7A2A, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        sear: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wound_fire", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 44
                },
                {
                    name: "lick", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 2 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dazed", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xFFD08A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xD8A47A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firefang", 1, FirefangDefinition);
