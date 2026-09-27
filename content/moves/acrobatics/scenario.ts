/**
 * 空手的摔角鹰人从正面发起杂技，静止的普通体型目标。
 * 断言只取本设计的必然事实：主伤在身体已经走出侧向弧、贴到目标身侧时发生，而不是先正面直撞再补绕行；
 * 之后身体仍带侧向位移并绕过目标。伤害数值受命中率、暴击与相性影响，放在 note 里。
 * 目标用普通体型：大体型目标会使侧弧超出 reach+carry 总位移预算，改走有限短撞（另一条设计路径）。
 */
Smoke.scenario("acrobatics", function (stage) {
    stage.time("night");
    // 起手时已在射程内，让共享接近逻辑不再贴身，侧弧与余势才有展开的余地。
    var caster = stage.pokemon({ species: "Hawlucha", level: 30, moves: ["acrobatics"], at: [0.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    var track: number[][] = [];
    stage.until(900, function () {
        if (stage.tick() >= 61 && stage.tick() <= 170) {
            var sample = caster.position();
            track.push([stage.tick(), Math.round(sample[0] * 100) / 100, Math.round(sample[1] * 100) / 100, Math.round(sample[2] * 100) / 100]);
        }
        return stage.casts("acrobatics", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("acrobatics", caster) > 0, "杂技被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "侧弧接触到了目标");
        stage.setPp(caster, "acrobatics", 0);
        // 场地沿 +x 对峙：主伤那一刻身体的 z 向偏移就是侧弧上的横向位移。
        var contact = caster.position(), target = foe.position();
        var lateral = Math.abs(contact[2] - target[2]);
        var maximumSide = lateral;
        stage.until(60, function () {
            var at = caster.position(), opponent = foe.position();
            maximumSide = Math.max(maximumSide, Math.abs(at[2] - opponent[2]));
            return maximumSide > 0.3 && at[0] - opponent[0] > 0.3;
        }, function () {
            stage.expect(lateral > 0.3, "主伤发生在侧向弧上，而非正面直撞");
            stage.expect(maximumSide > 0.3, "命中后身体仍沿侧向绕行");
            stage.note("开阔场地内主伤发生在目标身侧，命中后借余势绕过目标；空手伤害、腾身低障与顶棚/落脚约束交由试玩检查。",
                { casts: stage.casts("acrobatics", caster), damage: stage.damageTo(foe), contact: contact,
                    contactLateral: lateral, finish: caster.position(), target: foe.position(), maximumSide: maximumSide, track: track });
            stage.done();
        }, "杂技命中后绕到目标另一面");
    }, "杂技命中并造成伤害");
});
