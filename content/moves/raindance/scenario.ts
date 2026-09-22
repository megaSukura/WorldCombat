// 求雨：把雨叫到交战区，雨里的人被淋湿。断言“放出来了”和“有人挂上共享的湿身份”两件必然事实。
// 水招增强、火招削弱在结算时读取；本场景没有第二只会水火招的施法者，属性结算留给轨迹与试玩观察。
Smoke.scenario("raindance", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "poliwag", level: 32, moves: ["raindance"], at: [-4, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("raindance", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/soaked") || stage.hadMobEffect(target, "world_combat:status/soaked"));
    }, function () {
        stage.expect(stage.casts("raindance", caster) > 0, "raindance was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/soaked") || stage.hadMobEffect(target, "world_combat:status/soaked"),
            "a body inside the rain carries the shared soaked identity");
        stage.note("rain laid over the engagement; the drenched identity landed on a body inside it. Water x1.5 / Fire x0.5 and the douse path need a second caster and are left to play.",
            { casts: stage.casts("raindance", caster),
              casterSoaked: stage.hadMobEffect(caster, "world_combat:status/soaked"),
              targetSoaked: stage.hadMobEffect(target, "world_combat:status/soaked") });
        stage.done();
    }, "rain falls on the arena");
});
