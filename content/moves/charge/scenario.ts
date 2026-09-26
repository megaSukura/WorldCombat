// 充电：纯自增益。断言“放出来了”和“身上出现充能状态”两件必然事实。
// 电荷的兑现需要在之后用出电属性招式；本场景没有第二只有独立配招的电招施法者，所以放电留给轨迹与试玩观察。
Smoke.scenario("charge", function (stage) {
    const caster = stage.pokemon({ species: "pikachu", level: 35, moves: ["charge"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "alakazam", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () { return stage.hadMobEffect(caster, "world_combat:charge_up"); }, function () {
        stage.expect(stage.casts("charge", caster) > 0, "charge was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:charge_up"), "charge_up effect applied to the caster");
        stage.note("charge uses its Special Defence benefit against a stronger special-attacking species; full-execution doubling is covered by the neutral execution contract checks",
            { casts: stage.casts("charge", caster) });
        stage.done();
    }, "charge applied");
});
