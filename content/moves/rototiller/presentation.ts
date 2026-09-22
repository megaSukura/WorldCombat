/**
 * 耕地 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把耙齿按进身前的地面一拉，表土被翻起、土块向两侧崩开，翻过的土面透出暗棕的肥光；
 *   站在土上的草属性脚下顶出嫩芽，双攻一起抬起来。
 *
 * 色相家族：土棕（0x6B4A2B）画翻开的土，暖褐（0x9A6B3F）做土块高光，嫩绿（0x86C96A）只出现在
 *   草属性脚下的草叶与芽尖——一个色相家族加中性土色，没有第二个色相。
 * 层次：起（耙齿拢土）／翻（土面、土块、草芽三拍）／持（贴地的肥光）／收（落回）。
 * 起击收：rake（起）→ till（击）→ soil（持，随场地续期）→ fed（被喂养的人）→ fade（收）。
 * 范围：till 的 soil 层绑 `data.scale`（实际耕地半径 / 3.0）铺出与判定同径的地环；玩家一眼知道站哪块土会被照顾。
 * 运动：土块由落点向两侧与上方崩开、带重力落回；草芽从脚边向上顶；持期间肥光贴地不动、缓慢明灭。
 * 数：土块量绑 `data.clods`（体重与物攻派生），草芽与嫩叶量绑 `data.grow`（双攻等级派生），
 *   范围与尺寸绑 `data.scale`（体型与特攻派生）——都由本招算出的机制值驱动。
 */
const RototillerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rake: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "rake_gather", bind: "source", fit: "body", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "clods", fallback: 16 }, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 1.0, thickness: 0.6 }, direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0x9A6B3F, alpha: [0.7, 0], light: "world", spin: 12, maxParticles: 60
                }
            ]
        },
        till: {
            duration: 40,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "till_soil", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 44, repeats: 3, interval: 4 },
                    shape: { kind: "circle", radius: 3.0, thickness: 0.95 }, direction: "outward", speed: [0.06, 0.2],
                    lifetime: [18, 30], size: [0.2, 0.08], sizeMode: "index",
                    color: 0x6B4A2B, alpha: [0.7, 0], light: "world", gravity: 0.02, drag: 0.94, spin: 16, maxParticles: 160
                },
                {
                    name: "till_clods", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 16 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: 2.4 }, direction: "outward", speed: [0.08, 0.26],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x9A6B3F, alpha: [0.8, 0], light: "world", gravity: 0.03, drag: 0.93, maxParticles: 160
                },
                {
                    name: "till_sprout", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 6, at: 6 }, shape: { kind: "ring", radius: 2.6 },
                    direction: "up", speed: [0.05, 0.14],
                    lifetime: [16, 26], size: [0.34, 0.12],
                    color: 0x86C96A, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 14
                }
            ]
        },
        soil: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "soil_edge", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 8, shape: { kind: "circle", radius: 3.0, thickness: 0.98 },
                    direction: "up", speed: [0.002, 0.012], spin: 6,
                    lifetime: [34, 56], size: [0.1, 0.03],
                    color: 0x6B4A2B, alpha: [0.2, 0], alphaMode: "sin", light: "world", maxParticles: 40
                },
                {
                    name: "soil_motes", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [26, 44], size: [0.05, 0.01],
                    color: 0x9A6B3F, alpha: [0.16, 0], light: "world", maxParticles: 28
                }
            ]
        },
        fed: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fed_sprout", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "grow", fallback: 1 }, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.55 }, direction: "up", speed: [0.04, 0.12],
                    gravity: 0.018, drag: 0.95, spin: 14,
                    lifetime: [16, 26], size: [0.18, 0.06],
                    color: 0x86C96A, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fed_strength", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE8D9A0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_dust", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x6B4A2B, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rototiller", 1, RototillerDefinition);
