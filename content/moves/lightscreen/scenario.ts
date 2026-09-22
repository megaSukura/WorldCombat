// 光墙的可执行设计说明：这是一层罩住自己与队友的特殊屏障，所以场面要有队友、也要有让 AI 张幕的威胁。
// 必然事实：光墙被放出来过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/lightscreen。
// 特殊被削减、附带效果被滤淡需要一次真实特殊命中，属随机结果，写进 note 供完整装配试玩核对。
Smoke.scenario("lightscreen", function (stage) {
    var caster = stage.pokemon({ species: "ralts", level: 32, moves: ["lightscreen"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "abra", level: 24, moves: ["confusion"], at: [6, 0, 0] });
    stage.team("screened", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("lightscreen", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/lightscreen") && stage.hadMobEffect(ally, "world_combat:status/lightscreen");
    }, function () {
        stage.expect(stage.casts("lightscreen", caster) > 0, "lightscreen was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/lightscreen"), "caster carried the shared lightscreen identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/lightscreen"), "the nearby ally carried the shared lightscreen identity");
        stage.note("光墙以施法者为锚，提交时与之后每 20 刻把同一层光幕补给半径内的友方；特殊伤害在结算前按 cut 削减，附带次要效果的几率按 damp 滤淡（命中与附带效果是随机结果，留给完整装配试玩）。时长、半径、光尘随特防/身高/等级变化，厚幕与柔幕各有取舍。", {
            casts: stage.casts("lightscreen", caster), casterHp: caster.health(), allyHp: ally.health()
        });
        stage.done();
    }, "lightscreen covers the pair");
});
