/**
 * 丛林治疗：脚下自然地面抽芽、藤蔓包住获益者、补血与治病各自短闪。
 *
 * - erupt：vine_ring/sprout_burst/soil 以实际半径（fit none + data.scale）从脚点炸开；没有自然地面时只剩基础爆发。
 * - sprout：每个真实自然地面采样点各发一次，point 处冒一簇嫩芽（data.sprout）与碎叶（data.leaf），逐点发芽、互不连线。
 * - vine：只发给真正拿到回血或清除状态的人；grow 沿 data.path（本人脚下→身体的一小段）长出短藤，
 *   wrap_short 在目标身上轻缠，leaf 数量来自参数。这是「真实受益者短生长连接」。
 * - embrace 只发给真正拿到回血或清除状态的人：heal_flash 按 data.healSpark（实际回复量）闪，cure_gold 按
 *   data.cured（实际清除项数）闪，二者各自真实。
 * - 所有数量来自参数的 data.vines / data.motes，圆环半径来自 data.radius 与 data.scale。
 */
const JungleHealingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "seed_swirl", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "circle", radius: 0.7, thickness: 0.8 },
                    direction: "inward", speed: [0.03, 0.1], spin: 25,
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0x8FD05A, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "sprout_low", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], spin: 20,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0x6FC24E, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        erupt: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "vine_ring", bind: "point", offset: [0, 0.10, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 22 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 3.0, thickness: 0.85 },
                    direction: "outward", speed: [0.08, 0.24], spin: 40, gravity: 0.01, drag: 0.94,
                    lifetime: [12, 22], size: [0.14, 0.02],
                    color: 0x6FC24E, alpha: [0.85, 0], light: "full", maxParticles: 140
                },
                {
                    name: "sprout_burst", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "vines", fallback: 10 } }, shape: { kind: "circle", radius: 3.0, thickness: 0.7 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 24], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xBCE87A, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "soil", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "circle", radius: 3.0, thickness: 0.6 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x6B5A3A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        embrace: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "wrap", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.18], spin: 45, drag: 0.93,
                    lifetime: [12, 22], size: [0.13, 0.02],
                    color: 0x6FC24E, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "heal_flash", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "healSpark", fallback: 0 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.13], drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xBCE87A, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "cure_gold", bind: "target", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "cured", fallback: 0 }, interval: 2, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xF2D06A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "fresh", bind: "target", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 24], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBCE87A, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        sprout: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "point_sprout", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "sprout", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [14, 24], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xBCE87A, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "point_leaf", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaf", fallback: 2 } },
                    shape: { kind: "circle", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0x8FD05A, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        vine: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "grow", bind: "path", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "leaf", fallback: 2 }, interval: 2, repeats: 3 },
                    shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xBCE87A, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "wrap_short", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaf", fallback: 2 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14], spin: 45, drag: 0.93,
                    lifetime: [12, 22], size: [0.13, 0.02],
                    color: 0x6FC24E, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        residue: {
            duration: 28,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "vines", fallback: 10 }, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 3.0, thickness: 0.8 }, direction: "down", speed: [0.01, 0.05], spin: 20, gravity: 0.012,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x8FD05A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "breath", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "circle", radius: 3.0, thickness: 0.7 },
                    direction: "up", speed: [0.01, 0.04], drag: 0.95,
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0xBCE87A, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_junglehealing", 1, JungleHealingDefinition);
