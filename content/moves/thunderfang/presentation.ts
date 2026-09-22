/**
 * 雷电牙 / thunderfang 的客户端表现。
 *
 * 一句话：牙间窜起电光、脚边亮起一圈静电 → 沿一条直线飞快扑出、身后拖出电弧 → 咬实的一刻在接触点炸开电色迸溅与獠牙剪影，
 * 电流从伤口沿身体爬成一层噼啪的麻电；若目标本就麻着，一圈更亮的电流把它锁在原地。
 * 色相家族：电黄（0xE8D24A）与近白（0xFFF6B0），白光只出现在咬实与电锁的核心。
 * 拍子：起 charge（聚电）→ 扑 pounce → 咬 bite（命中峰值）／ 麻 jolt ／ 锁 lock → 懵 flinch ／ miss。
 * 范围：bite 绑命中点，lock 绑目标脚边，画出的就是被咬中的位置与被钉住的身体。
 * 运动：速度线沿扑出方向掠过；jolt 的麻电沿目标身体向上爬；lock 的电流贴地收成一圈；flinch 的星子从头顶上飘。
 * 数：`data.sparks`（速度派生）决定咬中与麻电的弧数；`data.intensity`（威力 / 65）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.42）放大牙影与判定环。
 */
const ThunderfangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 13,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 11], size: [0.16, 0.03],
                    color: 0xE8D24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 48
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 8, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 9], size: [0.1, 0.03],
                    color: 0xFFF6B0, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        pounce: {
            duration: 26,
            exit: { stop: 18, drain: 12 },
            emitters: [
                {
                    name: "arc_trail", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 28, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [4, 9], size: [0.12, 0.03],
                    color: 0xFFF6B0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "bite_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [3, 6], size: [0.15, 0.04],
                    color: 0xFFF6B0, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        bite: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF6B0, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "shock", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 7 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "static", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 7 } },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [7, 14], size: [0.11, 0.03],
                    color: 0xE8D24A, alpha: [0.9, 0], light: "full", maxParticles: 110
                }
            ]
        },
        jolt: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crawl", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 7 }, interval: 2, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.36, length: 1.4 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFF6B0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        lock: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "cage", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "sparks", fallback: 7 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [5, 11], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xE8D24A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "knot", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 7 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xFFF6B0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 44
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
                    color: 0xFFF6B0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
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
                    color: 0xD8CFA0, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunderfang", 1, ThunderfangDefinition);
