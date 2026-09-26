// 耕地的执行性设计说明：它把一块真正的地翻出来，受它照顾的草属性必须站在翻成功的土格上。
// 场面上要有草属性伙伴（否则这招没有意义），也要有让 AI 先翻土的威胁；地面用自然土，翻得动。
// 必然事实：施法者提交过耕地；站在翻过的土上的草属性伙伴身上出现过共享身份 world_combat:status/plowed；
// 选定的地面确实被换过方块（粗土，租借、到期复原），而且自然土之外（建筑表面）不改。
// 抬起几级双攻、土地留多久、翻了几格，写进 note（私有装配读不到原生能力等级，属设计事实）。
Smoke.scenario("rototiller", function (stage) {
    stage.weather("clear");
    stage.time("day");
    // 先把地表登记下来，之后才看得出耕地真的换了方块；自然土才翻得动。
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");

    var caster = stage.pokemon({ species: "sandshrew", level: 34, moves: ["rototiller"], at: [0.5, 0, 0] });
    // 草伙伴站在施法者身后：僵尸先盯上更近的施法者，AI 才有眼前的威胁可判定。
    var ally = stage.pokemon({ species: "bulbasaur", level: 30, moves: ["tackle"], at: [-1.0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    stage.team("field", [caster, ally]);
    // 只让僵尸盯住施法者：再一次 hostile 会把它的目标改到草伙伴身上，施法者就没有眼前的威胁。
    stage.hostile(caster, foe);
    // 让草伙伴留在翻好的土上，验证增益随场地而不是随动作存活。
    stage.noai(ally);

    stage.until(600, function () {
        return stage.casts("rototiller", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/plowed");
    }, function () {
        stage.expect(stage.casts("rototiller", caster) > 0, "rototiller was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/plowed"),
            "the grounded Grass ally was fed by a tilled patch");
        stage.expect(stage.changedBlocks().some(function (entry) { return entry.after === "minecraft:coarse_dirt"; }),
            "the chosen natural soil was actually tilled");
        // 挥完耙之后再等一会儿：翻耕动作早已结束，土与增益都还在，说明这是场地而不是一次动作回执。
        stage.after(40, function () {
            stage.expect(stage.hasMobEffect(ally, "world_combat:status/plowed"),
                "the grounded Grass ally stayed fed after the cast action ended");
            stage.expect(stage.changedBlocks().some(function (entry) {
                return entry.after === "minecraft:coarse_dirt";
            }), "the tilled soil outlived the cast action");
            stage.note("耕地只对自然土写下粗土，真正翻成功的格子构成增益场地：只有站在这些格上、脚下紧邻粗土的草属性才会被喂养（离地或站到没翻成的洞上不算），离开或土被复原时按 amplifier 原样收回。建筑表面翻不动、不改方块，也不建增益场地。双攻等级随特攻与耕法、土半径随体型与特攻、土时长随等级与防御、土块量随体重与物攻、射程随等级与特攻分别变化；私有装配读不到原生能力等级，这几项留给完整装配的人工试玩。", {
                casts: stage.casts("rototiller", caster), casterHp: caster.health(), allyHp: ally.health(),
                changed: stage.changedBlocks().length, tick: stage.tick()
            });
            stage.done();
        });
    }, "rototiller feeds the grounded grass ally");
});
