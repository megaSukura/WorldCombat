/** One cast among five stationary ordinary targets verifies finite victim and damage caps. */
Smoke.scenario("sheercold", function (stage) {
    stage.weather("clear");
    stage.time("night");

    var casterAt = [-2.6, 0, 0];
    var foeAt: number[][] = [[0, 0, 0], [1.4, 0, 0.6], [1.4, 0, -0.6], [0.4, 0, 1.5], [0.4, 0, -1.5]];
    var caster = stage.pokemon({ species: "lapras", level: 40, moves: ["sheercold"], at: casterAt });
    var foes: Smoke.Actor[] = [];
    for (var i = 0; i < foeAt.length; i++) {
        foes.push(stage.mob({ type: "minecraft:zombie", at: foeAt[i] }));
        stage.noai(foes[i]);
    }
    // 只留一发，让「一次结霜」的合计上界可以被断言。寒霜只作表现，原地表保持。
    stage.setPp(caster, "sheercold", 1);

    stage.until(360, function () { return caster.alive() && foes[0].alive(); }, function () {
        for (var i = 0; i < foes.length; i++) stage.hostile(caster, foes[i]);
        stage.until(1200, function () {
            return stage.casts("sheercold", caster) > 0 && stage.damageBy(caster) > 0;
        }, function () {
            stage.expect(stage.casts("sheercold", caster) > 0, "绝对零度被放出来了");
            stage.expect(stage.damageBy(caster) > 0, "整圈结霜冻伤了圈内的目标");
            stage.expect(stage.changedBlocks().length === 0, "寒霜余光保持原地面");
            stage.expect(stage.hits(caster) <= 4, "一次冷域最多四个真实命中");
            stage.expect(stage.damageBy(caster) <= 400, "一次结霜的合计伤害不超过 400");
            stage.note("命中按以落点为心的真实三维冷域与圈心遮挡取最近的受体；非冰目标各承受一笔有限固定伤害，最多四个；冰属性目标免疫。",
                { casts: stage.casts("sheercold", caster), dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                  casterAlive: caster.alive(), changed: stage.changedBlocks().length });
            stage.done();
        }, "绝对零度命中");
    }, "双方存活");
});
