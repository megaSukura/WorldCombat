/**
 * 寄生种子 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里聚起一粒种子 → 种子沿弹道抛出去、扎进目标身上生根 →
 *   此后每隔一会儿，一根藤从目标身上把汁液抽回施放者；根枯时散成一撮土。
 *
 * 色相家族：草绿 0x6FBF3F 为主体，深绿 0x2F7A2A 做藤与根，浅黄绿 0xC7F08A 只做抽回的高光，土褐 0x241A10 做余韵。
 * 层次：种子（主体，`generic/grass/seed`）／藤与汁流（细节，沿路径的光点与叶）／土（余韵）。
 * 拍子：gather（聚种 0–16t）→ throw（抛种）→ root（生根 0–28t）→ drain（抽取 ×N）→ wither（枯萎 0–22t）。
 * 范围：root 与 drain 的藤沿 `data.path`（目标 ↔ 施放者）画出，长度就是两者当前的实际距离——
 *   根连到哪、抽到哪一眼可读；drain 的粗细与亮度随 `data.intensity`（这一口占目标最大生命的比例）变化。
 * 运动：种子沿弹道飞行、命中时向体内收拢；drain 时细光点沿 `data.path` 从目标一侧抽回施放者。
 * 数：藤蔓与光点数量绑 `data.vines`（特攻派生），每口的实抽量由 `data.amount` 与 `data.intensity` 写出。
 */
const LeechSeedDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "seed", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 2, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.22, 0.14], sizeMode: "index",
                    color: 0x6FBF3F, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.01], sizeMode: "sin",
                    color: 0xC7F08A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        throw: {
            duration: 60,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: 26, shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0x6FBF3F, alpha: [0.75, 0], light: "full", maxParticles: 50
                },
                {
                    name: "streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 6, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x2F7A2A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        root: {
            duration: 28,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "sprout", bind: "target", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "vines", fallback: 8 } }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.28, 0.12], sizeMode: "index",
                    color: 0x6FBF3F, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "impact", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 13], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xC7F08A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "crawl", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, direction: "shape", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x2F7A2A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "vines", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "vines", fallback: 8 } }, direction: "shape", speed: [0.12, 0.3],
                    lifetime: [8, 14], size: [0.18, 0.02], sizeMode: "index",
                    color: 0x2F7A2A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "sap", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "vines", fallback: 8 } }, direction: "shape", speed: [0.24, 0.55],
                    lifetime: [7, 13], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xC7F08A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "wobble", bind: "target", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x6FBF3F, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        wither: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "dry", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [14, 24], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8A7A3A, alpha: [0.6, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 30
                },
                {
                    name: "soil", bind: "target", fit: "body", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x241A10, alpha: [0.42, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leechseed", 1, LeechSeedDefinition);
