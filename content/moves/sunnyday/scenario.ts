// 大晴天：把烈日叫到交战区，光里的人被晒暖。断言“放出来了”和“有人挂上共享的晴暖身份”两件必然事实。
// 火招增强、水招削弱、解冻与烘干在结算与场地规则里读取；本场景没有第二只会水火招的施法者，留给轨迹与试玩观察。
Smoke.scenario("sunnyday", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "charmander", level: 32, moves: ["sunnyday"], at: [-4, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("sunnyday", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/sunlit") || stage.hadMobEffect(target, "world_combat:status/sunlit"));
    }, function () {
        stage.expect(stage.casts("sunnyday", caster) > 0, "sunnyday was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/sunlit") || stage.hadMobEffect(target, "world_combat:status/sunlit"),
            "a body inside the sun carries the shared sunlit identity");
        stage.note("sun laid over the engagement; the sunlit identity landed on a body inside it. Fire x1.5 / Water x0.5, thaw and dry need a second caster and are left to play.",
            { casts: stage.casts("sunnyday", caster),
              casterSunlit: stage.hadMobEffect(caster, "world_combat:status/sunlit"),
              targetSunlit: stage.hadMobEffect(target, "world_combat:status/sunlit") });
        stage.done();
    }, "sun falls on the arena");
});
