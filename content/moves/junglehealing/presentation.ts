/**
 * 丛林治疗 / Jungle Healing 的粒子语言。
 *
 * 一句话：施法者把双手按进土里，一圈藤蔓与嫩芽从地里炸起、缠上自己与身边的伙伴；被缠住的人身上绿光回旋、
 *   伤口愈合、异常化掉，地上再留下一丛会自己谢去的嫩芽。
 * 色相家族：叶绿 0x6FC24E 作主体，嫩黄绿 0xBCE87A 作新芽与治疗光，暖金 0xF2D06A 只出现在自然地面的加成层。
 * 拍子：起（call 按地唤芽）／炸（erupt 藤蔓炸开）／缠（embrace 命中治疗与净化）／留（residue 嫩芽留地）。
 * 范围：erupt / residue 的藤环绑脚点、`fit:"none"`，形状按参考半径 3.0 书写、由 `data.scale`（实际半径 / 3.0）
 *   推出真实大小——画面里的环就是会被缠住的范围。
 * 运动：藤蔓与嫩芽从地面向外炸起；命中层叶片绕身回旋上升；余韵叶片落回地面。
 * 数：藤蔓与叶片发射量绑 `data.motes`（特攻＋身高派生），地面嫩芽格数绑 `data.vines`（身量与等级派生）。
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
                    name: "green_light", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.13], drag: 0.92,
                    lifetime: [10, 20], size: [0.08, 0.01],
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
