// 电气场地：把电流按进交战区的地面，站上去的人被电托住。断言“放出来了”和“施法者挂上共享的电场身份”两件必然事实。
// 电招加成、入眠拒绝与电醒在结算与场地规则里读取；本场景只有一只施法者，留给轨迹与试玩观察。
Smoke.scenario("electricterrain", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "pikachu", level: 32, moves: ["electricterrain"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("electricterrain", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/electricterrain") || stage.hadMobEffect(target, "world_combat:status/electricterrain"));
    }, function () {
        stage.expect(stage.casts("electricterrain", caster) > 0, "electricterrain was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/electricterrain") || stage.hadMobEffect(target, "world_combat:status/electricterrain"),
            "a grounded body on the charged ground carries the shared electricterrain identity");
        stage.note("charge pressed into the ground; the grounded identity landed on a body standing on it. Electric x1.3, the sleep gate and the wake-up cure need a second caster and are left to play.",
            { casts: stage.casts("electricterrain", caster),
              casterCharged: stage.hadMobEffect(caster, "world_combat:status/electricterrain"),
              targetCharged: stage.hadMobEffect(target, "world_combat:status/electricterrain") });
        stage.done();
    }, "the ground is charged");
});
