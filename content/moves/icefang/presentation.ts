/**
 * 冰冻牙 / icefang 的客户端表现。
 *
 * 一句话：牙间凝起冷霜、冰屑绕口打转 → 沿一条直线扑出、身后拖出霜迹 → 咬实的一刻在接触点炸开冰色迸溅与獠牙剪影，
 * 隔一拍后寒气在伤口里发作、把目标从脚往上一层层冻住；若目标本就冻着，咬中的瞬间冰壳四散崩碎；若冻不住，冷气只在表面散一层霜。
 * 色相家族：冰蓝（0x8FD8F0）与霜白（0xE8FAFF），深蓝（0x4FA8D8）只压在核心一点。
 * 拍子：起 charge（凝霜）→ 扑 pounce → 咬 bite（命中峰值）／ 碎 shatter ／ 冻 freeze ／ 抗 resist → 懵 flinch ／ miss。
 * 范围：bite／shatter／freeze 绑命中点与目标，画出的就是咬中的位置与结冰的身体。
 * 运动：速度线沿扑出方向掠过；freeze 的冰晶由下向上包住目标；shatter 的碎片向外崩开；flinch 的星子从头顶上飘。
 * 数：`data.shards`（特攻派生）决定结冰与碎片层的数量；`data.intensity`（威力 / 66）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.42）放大牙影与判定环。
 */
const IcefangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 15,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0x8FD8F0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 44
                },
                {
                    name: "shards", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 8, shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xE8FAFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 36
                }
            ]
        },
        pounce: {
            duration: 30,
            exit: { stop: 22, drain: 12 },
            emitters: [
                {
                    name: "frost_trail", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 26, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xC8ECFA, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "bite_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xD8F4FF, alpha: [0.4, 0], light: "full", maxParticles: 110
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
                    color: 0xE8FAFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "ice_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "splinters", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 16], size: [0.1, 0.03],
                    color: 0x8FD8F0, alpha: [0.8, 0], light: "full", maxParticles: 110
                }
            ]
        },
        shatter: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.28],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [7, 14], size: [0.13, 0.04], sizeMode: "index",
                    color: 0xC8ECFA, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "mist", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "shards", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xE8FAFF, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        freeze: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "encase", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 2, repeats: 3 },
                    shape: { kind: "cylinder", radius: 0.36, length: 1.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.04], sizeMode: "index",
                    color: 0x8FD8F0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "chill", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 3 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xE8FAFF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        resist: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sheet", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.24],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xC8ECFA, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shed", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.28],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0x8FD8F0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 50
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
                    color: 0x8FD8F0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
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
                    color: 0xC8ECFA, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icefang", 1, IcefangDefinition);
