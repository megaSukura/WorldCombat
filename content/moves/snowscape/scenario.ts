// 雪景：在一片区域落下一场不伤人的雪，冰之躯防御提高。断言「放出来了」和「有人挂上共享的雪景身份」两件必然事实；
// 防御等级、覆雪与冻水在区域规则里结算，场景把地面变化记进 note 供读轨迹。
Smoke.scenario("snowscape", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "glaceon", level: 34, moves: ["snowscape"], at: [-4, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("snowscape", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/snow");
    }, function () {
        stage.expect(stage.casts("snowscape", caster) > 0, "snowscape was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/snow"), "the Ice caster inside the snow carries the shared snow identity");
        stage.note("snow falls over the engagement; Ice bodies inside gain a Defense stage and the ground cover rests on the arena. The changed ground is listed under groundBlocks.",
            { casts: stage.casts("snowscape", caster),
              casterSnow: stage.hadMobEffect(caster, "world_combat:status/snow"),
              casterDamage: stage.damageTo(caster),
              groundBlocks: stage.changedBlocks().length });
        stage.done();
    }, "snow settles on the arena");
});
