// 耕地的执行性设计说明：它把一块真正的地翻出来，受它照顾的草属性必须站在上面。
// 场面上要有草属性伙伴（否则这招没有意义），也要有让 AI 先翻土的威胁。
// 必然事实：施法者提交过耕地；站在翻过的土上的草属性伙伴身上出现过共享身份 world_combat:status/plowed；
// 选定的地面确实被换过方块（粗土，租借、到期复原）。
// 抬起几级双攻、土地留多久、翻了几格，写进 note（私有装配读不到原生能力等级，属设计事实）。
Smoke.scenario("rototiller", function (stage) {
    stage.weather("clear");
    stage.time("day");
    // 先把地表登记下来，之后才看得出耕地真的换了方块。
    stage.fill([-5, -1, -5], [5, -1, 5], "minecraft:stone");

    var caster = stage.pokemon({ species: "sandshrew", level: 34, moves: ["rototiller"], at: [-1.5, 0, 0] });
    var ally = stage.pokemon({ species: "bulbasaur", level: 30, moves: ["tackle"], at: [0.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("field", [caster, ally]);
    stage.hostile(caster, foe);
    stage.hostile(ally, foe);

    stage.until(900, function () {
        return stage.casts("rototiller", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/plowed");
    }, function () {
        stage.expect(stage.casts("rototiller", caster) > 0, "rototiller was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/plowed"),
            "the grounded Grass ally was fed by a tilled patch");
        stage.expect(stage.changedBlocks().length > 0, "the chosen ground was actually tilled");
        stage.note("耕地以选定点为心翻出一块黑土：只有站在这块土上、且踩实地面的草属性才会被喂养（浮空的不算），离开这块土或土被复原时，本单元抬起的双攻按 amplifier 原样收回。双攻等级随特攻与耕法、土半径随体型与特攻、土时长随等级与防御、土块量随体重与物攻、射程随等级与特攻分别变化；私有装配读不到原生能力等级，这几项留给完整装配的人工试玩。", {
            casts: stage.casts("rototiller", caster), casterHp: caster.health(), allyHp: ally.health(),
            changed: stage.changedBlocks().length, tick: stage.tick()
        });
        stage.done();
    }, "rototiller feeds the grounded grass ally");
});
