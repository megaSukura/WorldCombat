// 冷笑话：一次冷场 + 退场。断言「放出来了」「施法者挂上共享的雪身份」「施法者离开了原位」三件必然事实；
// 冻住几个敌人、打断与松仇恨在 skill.ts 里结算，场景把被冻人数记进 note 供读轨迹。
// 真正的「后备宝可梦替换」需要共享入口，本场景只验证可观察到的部分（见报告共享前置）。
Smoke.scenario("chillyreception", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "vanillite", level: 34, moves: ["chillyreception"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 24, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("chillyreception", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/snow");
    }, function () {
        stage.expect(stage.casts("chillyreception", caster) > 0, "chillyreception was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/snow"), "the caster carries the shared snow identity");
        stage.after(120, function () {
            stage.expect(stage.travelled(caster) > 0.5, "the caster slipped away from its spot");
            stage.note("the joke lands: nearby foes are interrupted, rooted and lose their target, snow is left behind, and the caster withdraws. The literal party replacement needs a shared send-out/recall entry and is not claimed here.",
                { casts: stage.casts("chillyreception", caster), moved: Math.round(stage.travelled(caster) * 10) / 10,
                  targetHushed: stage.hadMobEffect(target, "world_combat:status/cold_silence"),
                  targetDamage: stage.damageTo(target) });
            stage.done();
        });
    }, "the joke lands");
});
