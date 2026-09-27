Smoke.scenario("guillotine", function (stage) {
    stage.weather("clear");
    stage.time("night");

    var caster = stage.pokemon({ species: "pinsir", level: 40, moves: ["guillotine"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    stage.noai(foe);

    stage.until(360, function () { return caster.alive() && foe.alive(); }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("guillotine", caster) > 0 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("guillotine", caster) > 0, "断头钳被放出来了");
            stage.expect(stage.damageTo(foe) <= 160, "一次重夹保持有限预算");
            stage.expect(stage.hits(caster) === 1, "首个身体只结算一次");
            stage.expect(stage.damageTo(foe) > 0, "钳口咬合了目标，造成了有限伤害");
            stage.note("真实两刃在锁定平面逐刻收口，首个身体或墙结束本次动作；本场对原生Zombie完成有限命中。动态边缘与厚度的可读性待试玩。",
                { casts: stage.casts("guillotine", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10 });
            stage.done();
        }, "断头钳命中");
    }, "双方存活");
});
