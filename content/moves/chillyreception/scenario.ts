// 冷笑话：一次冷场 + 无后备时的退场。断言「放出来了」「施法者挂上共享的雪身份」「没有后备也会撤开」
// 三件必然事实；冷场的短打断与身份标记在 skill.ts 里结算，场景把被标记的敌人数记进 note 供读轨迹。
// 有后备时由共享 partySwitchOut 在同一点换手，属共享队伍入口；野生个体没有后备，本场景验证退场部分。
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
            stage.expect(stage.travelled(caster) > 0.5, "without a reserve the caster steps away from its spot");
            stage.note("the joke lands: nearby foes take one interruptible short interruption and the cold mark, snow is left behind, and the caster withdraws. With a legal reserve the shared partySwitchOut sends it out at the same exit point; the wild caster here has none, so it only steps away.",
                { casts: stage.casts("chillyreception", caster), moved: Math.round(stage.travelled(caster) * 10) / 10,
                  targetHushed: stage.hadMobEffect(target, "world_combat:status/cold_silence"),
                  targetDamage: stage.damageTo(target) });
            stage.done();
        });
    }, "the joke lands");
});
