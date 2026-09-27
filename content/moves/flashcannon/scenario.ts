/**
 * 加农光炮的可执行设计说明：让会这一招的精灵朝一列站桩对手射出光矛，验证它命中第一名并穿过
 * 两个后续目标。三名目标都睡眠、与施法者同在 x 轴上，保证三维贯穿线固定。
 * 默认是贯穿形态（可穿透 2 个后续目标），所以三个都应吃到伤害。
 *
 * 穿透保留比例、碾防（约 10% 起）、暴击都是随机结果，写进 note 供读轨迹判断；逐次伤害是否严格
 * 递减还受暴击影响，因此只断言吃到伤害，不把递减写死为断言。
 */
Smoke.scenario("flashcannon", function (stage) {
    var caster = stage.pokemon({ species: "magnemite", level: 36, moves: ["flashcannon"], at: [-7, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [0, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    var third = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], status: "sleep", at: [6, 0, 0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.hostile(caster, third);
    stage.until(1400, function () {
        return stage.casts("flashcannon", caster) > 0 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0 && stage.damageTo(third) > 0;
    }, function () {
        stage.expect(stage.casts("flashcannon", caster) > 0, "flashcannon was committed");
        stage.expect(stage.damageTo(first) > 0, "the lance hit the first target");
        stage.expect(stage.damageTo(second) > 0, "the lance pierced through and hit the second target");
        stage.expect(stage.damageTo(third) > 0, "the lance pierced both follow-ups and hit the third target");
        stage.note("the pierce falloff ratio, the passive Sp. Def rolls (about 10% base) and crits are random; all three targets were asleep on the same 3D line so the pierce geometry is fixed, and a crit can outweigh the falloff on any one contact", {
            casts: stage.casts("flashcannon", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            thirdDamage: Math.round(stage.damageTo(third) * 10) / 10
        });
        stage.done();
    }, "the lance pierces the first target and two follow-ups within 70 s");
});
