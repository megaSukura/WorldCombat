// 输电：瞬发单体通电，命中不掷骰。断言“放出来了”和“目标挂上通电状态”两件必然事实。
// 目标下一次出招变电属性的兑现需要它真的出招，本场景不装配第二只施法者，留给试玩与轨迹观察。
Smoke.scenario("electrify", function (stage) {
    const caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["electrify"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "onix", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:electrified"); }, function () {
        stage.expect(stage.casts("electrify", caster) > 0, "electrify was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:electrified"), "target carries world_combat:electrified");
        stage.note("electrify landed on the single foe; the type rewrite waits for its next move",
            { casts: stage.casts("electrify", caster), targetHealth: target.health() });
        stage.done();
    }, "electrified applied");
});
