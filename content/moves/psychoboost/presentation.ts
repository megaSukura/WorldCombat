/**
 * 精神突进 / psychoboost 的客户端表现。
 *
 * 一句话：施法者闭目、身周光华内敛，几圈念力环在锁定点上从四面收拢、猛地撞合成一个亮点炸开 →
 *   视线被遮断时念环在遮挡处向外散开而不亮爆点。
 * 色相家族：念力的品红（0xE070FF）与紫（0xA050E0）为主体，冷白（0xF0E8FF）作核心高光。
 * 拍子：起 gather（敛神）→ 合 charge（环收拢）→ 爆 implode（撞合）与 burst（命中）／散 disperse（视线遮断）。
 * 范围：charge 的环半径绑 `data.scale`（内爆半径派生）；disperse 用 `data.scale` 画出散开的环。
 * 运动：念力环由外向内收拢、撞合时向外炸开；被遮断时从遮挡点向外散开便止，不出现亮点。
 * 数：环数绑定 `data.rings`（特攻与等级派生），撞合强度绑定 `data.intensity`（威力 / 130）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PsychoboostDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "focus", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 22, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.16], spin: 20,
                    lifetime: [7, 13], size: [0.22, 0.04],
                    color: 0xE070FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "mind", bind: "source", offset: [0, 0.75, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xF0E8FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        charge: {
            duration: 0,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ring_outer", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 30, shape: { kind: "ring", radius: 2.2 },
                    direction: "inward", speed: [0.16, 0.4], spin: 16,
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xA050E0, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "ring_inner", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 26, shape: { kind: "ring", radius: 1.3 },
                    direction: "inward", speed: [0.14, 0.34], spin: 22,
                    lifetime: [7, 13], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xE070FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        implode: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "snap", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.3, 0.7], spin: 30,
                    lifetime: [5, 10], size: [0.5, 0.06], sizeMode: "index",
                    color: 0xF0E8FF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                },
                {
                    name: "flare", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [7, 14], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xE070FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "ripple", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 16], size: [0.35, 0.7],
                    color: 0xC890F0, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        burst: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: { data: "rings", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        disperse: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "loose", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [8, 16], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x9050C0, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "drift", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.05, 0.18], spread: 20, drag: 0.92,
                    lifetime: [7, 14], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xE070FF, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychoboost", 1, PsychoboostDefinition);
