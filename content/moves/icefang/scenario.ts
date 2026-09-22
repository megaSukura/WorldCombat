/**
 * 冰冻牙 / icefang 的可执行设计说明。
 *
 * 场面：只会冰冻牙的冰鬼护（glalie，L42，原生学习者）对 5 格外的卡比兽（snorlax，L50，只会跃起）；
 * 平地、白天晴天。开战后 AI 只有这一招可用，必须自己走近再咬。
 * 必然事实：本招被提交过；目标受到过咬合伤害。
 * 是否冻住（freezeChance）、冻多久、是否咬懵、冷脆是否触发（需目标已冻）、扑空还是咬中、暴击，都是概率与站位结果，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("icefang", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "glalie", level: 42, moves: ["icefang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("icefang", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("icefang", caster) > 0, "icefang was committed");
            stage.expect(stage.damageTo(foe) > 0, "the ice fang dealt damage");
            stage.note("the freeze is rolled a beat after the bite (frostDelay), not on impact; the shatter segment needs an already frozen target", {
                casts: stage.casts("icefang", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                frozen: stage.hadMobEffect(foe, "world_combat:status/frozen"),
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "ice fang lands on a foe within range");
});
