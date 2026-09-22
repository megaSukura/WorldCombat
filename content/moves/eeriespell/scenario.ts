/**
 * 诡异咒语的可执行设计说明：让会这一招的精灵对一名宝可梦出手，验证它命中、造成伤害并挂上
 * 共享身份「诡异」。PP 抽取只在目标用过招式后生效，属条件事实，写进 note。
 */
Smoke.scenario("eeriespell", function (stage) {
    var gastly = stage.pokemon({ species: "gastly", level: 30, moves: ["eeriespell"], at: [-7, 0, 0] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(gastly, snorlax);
    stage.until(700, function () { return stage.hadMobEffect(snorlax, "world_combat:status/eerie"); }, function () {
        stage.expect(stage.casts("eeriespell", gastly) > 0, "诡异咒语被放出来了");
        stage.expect(stage.damageTo(snorlax) > 0, "咒语打到了目标身上");
        stage.expect(stage.hadMobEffect(snorlax, "world_combat:status/eerie"), "目标挂上了共享身份「诡异」");
        stage.note("目标用过招式后才会抽走其最后招式的 3 点 PP；对非宝可梦只有「诡异」这一层。命中率与暴击不写断言。",
            { casts: stage.casts("eeriespell", gastly), damage: stage.damageTo(snorlax), travelled: stage.travelled(gastly) });
        stage.done();
    }, "目标挂上「诡异」");
});
