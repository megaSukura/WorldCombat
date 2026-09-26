/**
 * 剧毒牙 / poisonfang 的客户端表现。
 *
 * 一句话：牙面挂起毒滴、毒雾绕口打转 → 合牙的一刻在接触点炸开毒色迸溅与獠牙剪影 →
 * 隔一拍后毒液从伤口往外渗、冒成一簇毒泡；若加重成剧毒，泡更暗更密；若目标挣脱口边，毒滴只在原处落空。
 * 色相家族：毒绿（0x9BE86B）与深绿（0x5FBF3A），近白青（0xD4F58A）只做高光；剧毒用同一族的更暗绿，不引入第二色相。
 * 拍子：起 charge（挂毒）→ 咬 bite（命中峰值）／ miss → 灌 venom（渗毒，剧毒更暗）／ drip（挣脱落空）。
 * 范围：bite 绑命中点、venom 与 drip 绑伤口或原咬点，画出的就是咬中的位置与毒的去向。
 * 运动：venom 的毒泡从伤口向上冒并慢慢破开；drip 的毒珠在原咬点向下滴落。
 * 数：`data.drops`（特攻派生）决定渗出毒泡的数量；`data.intensity`（威力 / 54）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.40）放大牙影与判定环；`data.toxic`（1 为剧毒）把毒泡换成更暗更密的一层。
 */
const PoisonfangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "world", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "droplets", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 8, shape: { kind: "ring", radius: 0.26, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.05,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x5FBF3A, alpha: [0.9, 0], light: "world", maxParticles: 32
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
                    color: 0xD4F58A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "poison_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "drops", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "spatter", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [8, 16], size: [0.09, 0.03],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "world", maxParticles: 110
                }
            ]
        },
        venom: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "seep", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.14, 0.04], sizeMode: "index",
                    color: 0x9BE86B, alpha: [0.85, 0], light: "world", bloom: 0.25, maxParticles: 46
                },
                {
                    name: "toxic_pulse", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 8 }, interval: 3 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0x5FBF3A, alpha: 0.55, light: "world", maxParticles: 40
                },
                {
                    name: "coil", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    lifetime: [10, 16], size: [0.1, 0.03],
                    color: 0x5FBF3A, alpha: [0.8, 0], light: "world", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        drip: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fall", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05], gravity: 0.14, drag: 0.98,
                    lifetime: [10, 18], size: [0.09, 0.03], sizeMode: "index",
                    color: 0x5FBF3A, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "waste", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.24, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.08,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 40
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
                    color: 0xA8C88A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisonfang", 1, PoisonfangDefinition);
