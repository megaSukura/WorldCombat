// 迷人：异性宝可梦之间的一次飞吻软控。飞吻会缓慢追踪，开阔平地上几乎必中；
// 因此断言“放出来了”和“目标着了迷”两件必然事实，随机的心软次数留给轨迹读取。
Smoke.scenario("attract", function (stage) {
    const caster = stage.pokemon({ species: "pikachu", level: 40, moves: ["attract"], at: [-2, 0, 0], properties: "gender=female" });
    const target = stage.pokemon({ species: "raichu", level: 30, moves: [], at: [2, 0, 0], properties: "gender=male" });
    stage.hostile(caster, target);
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:status/attract"); }, function () {
        stage.expect(stage.casts("attract", caster) > 0, "attract was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/attract"), "target became infatuated");
        stage.note("attract landed by the opposite-gender rule and applied world_combat:status/attract",
            { casts: stage.casts("attract", caster), targetHealth: target.health() });
        stage.done();
    }, "infatuation applied");
});
