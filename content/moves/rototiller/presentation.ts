/**
 * 耕地 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把耙齿按进身前的地面一拉，**真正翻成功的土格**被翻起、土块从格上崩开，翻过的土面透出暗棕的肥光；
 *   站在土上的草属性脚下顶出嫩芽，双攻一起抬起来。打在石、木板等翻不动的表面上只有一次空落，不出土。
 *
 * 色相家族：土棕（0x6B4A2B）画翻开的土，暖褐（0x9A6B3F）做土块高光，嫩绿（0x86C96A）只出现在
 *   草属性脚下的草叶与芽尖——一个色相家族加中性土色，没有第二个色相。
 * 层次：起（耙齿拢土）／翻（逐格土面、土块、草芽三拍）／持（贴地与逐格轮廓的肥光）／收（落回）。
 * 起击收：rake（起）→ till_cell（击，每个真正翻成的格各一撮）→ soil（持，绑在场地效果上）→ fed（被喂养的人）→ fade（收）。
 * 范围：till_cell 逐格起土，没翻成的洞没有土；soil 与逐格描边都只覆盖 data 里的成功格，和判定同一份坐标。
 * 运动：土块由每个成功格向两侧与上方崩开、带重力落回；草芽从脚边向上顶；持期间肥光贴地不动、缓慢明灭。
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
        till_cell: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cell_soil", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "clods", fallback: 4 }, interval: 3, repeats: 2 },
                    shape: { kind: "circle", radius: 0.55, thickness: 0.95 }, direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 24], size: [0.18, 0.06], sizeMode: "index",
                    color: 0x6B4A2B, alpha: [0.7, 0], light: "world", gravity: 0.02, drag: 0.94, spin: 16, maxParticles: 40
                },
                {
                    name: "cell_sprout", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "grow", fallback: 1 }, at: 6 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [14, 22], size: [0.24, 0.1],
                    color: 0x86C96A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 10
                }
            ]
        },
        barren: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "barren_dust", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 8 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x6B4A2B, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        soil: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "soil_motes", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "circle", radius: 2.7 },
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

// 逐格描边：服务端把 terrainResult 真正翻成功的格子坐标放进 data.cells，这里只在成功格上画一圈贴地的暗棕轮廓。
// 没翻成的洞自然留白；绑定在场地效果上（WorldFeedback.onEffect），场地到期、被驱散或源离场时一起收。
WorldCombatClient.scene("world_combat:move_rototiller_soil", 1, function (frame) {
    const entry: CombatSceneEntry<{ cells: number[][]; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const cells = entry.data.cells || [];
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        frame.ring(cell[0], cell[1], cell[2], 0.34, 0x776B4A2B);
    }
});
