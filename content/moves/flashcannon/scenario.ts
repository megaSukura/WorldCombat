/**
 * 加农光炮的可执行设计说明：让会这一招的精灵朝一名站桩对手射出光矛，验证它命中、造成伤害；
 * 并在目标身后同一条线上再摆一个睡眠对手，验证光矛穿透、把第二个目标也打中。
 *
 * 两个目标都睡眠、与施法者同在 x 轴上，保证贯穿线固定。默认是贯穿形态（可穿透 2 个后续目标）。
 * 穿透保留比例、碾防（约 10% 起）、暴击都写进 note。
 */
Smoke.scenario("flashcannon", function (stage) {
    var caster = stage.pokemon({ species: "magnemite", level: 36, moves: ["flashcannon"], at: [-7, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [0, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1400, function () {
        return stage.casts("flashcannon", caster) > 0 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0;
    }, function () {
        stage.expect(stage.casts("flashcannon", caster) > 0, "flashcannon was committed");
        stage.expect(stage.damageTo(first) > 0, "the lance hit the first target");
        stage.expect(stage.damageTo(second) > 0, "the lance pierced through and hit the second target");
        stage.note("the pierce falloff ratio, the passive Sp. Def rolls (about 10% base) and crits are random; both targets were asleep on the same line so the pierce geometry is fixed", {
            casts: stage.casts("flashcannon", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            firstAlive: first.alive(),
            secondAlive: second.alive()
        });
        stage.done();
    }, "the lance pierces both lined-up targets within 70 s");
});
