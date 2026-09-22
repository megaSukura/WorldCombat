// 等离子浴：铺一片区域，里面的人会被电离。断言“放出来了”和“有人挂上离子膜”两件必然事实。
// 一般属性招式变电属性的兑现需要一只会普通招的宝可梦真正出招，本场景不装配第二只施法者，留给试玩与轨迹观察。
Smoke.scenario("iondeluge", function (stage) {
    const caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["iondeluge"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "onix", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.hadMobEffect(caster, "world_combat:status/ionized") || stage.hadMobEffect(target, "world_combat:status/ionized");
    }, function () {
        stage.expect(stage.casts("iondeluge", caster) > 0, "iondeluge was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ionized") || stage.hadMobEffect(target, "world_combat:status/ionized"),
            "someone inside the bath carries the ionized identity");
        stage.note("bath laid and the ion film landed on a body inside it",
            { casts: stage.casts("iondeluge", caster), casterIonized: stage.hadMobEffect(caster, "world_combat:status/ionized"), targetIonized: stage.hadMobEffect(target, "world_combat:status/ionized") });
        stage.done();
    }, "ion film applied");
});
