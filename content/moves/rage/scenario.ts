/**
 * 愤怒 / rage 的可执行设计说明。
 *
 * 场面：只会愤怒的火猴（30 级、固执）对一只僵尸，夜间（僵尸不会被日光灼烧），两者开战。
 * 必然事实：本招被提交过；目标受到过伤害（怒气一击抡中）；施法者身上点燃过共享身份 world_combat:status/rage 的怒火。
 * 挨打涨了几档物攻、是否抡空、暴击等是概率与时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("rage", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "mankey", level: 30, moves: ["rage"], at: [-2, 0, 0], properties: "nature=adamant" });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("rage", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(caster, "world_combat:status/rage");
    }, function () {
        stage.expect(stage.casts("rage", caster) > 0, "rage was committed");
        stage.expect(stage.damageTo(foe) > 0, "the angry swing dealt damage");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/rage"), "the rage stance was lit on the caster");
        stage.note("the stance was lit on cast; whether the zombie hit the caster enough to stoke Attack is timing-dependent and shown in the trace", {
            casts: stage.casts("rage", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "rage lights the stance and connects");
});
