/**
 * 打雷的可执行设计说明。
 *
 * 场面：一只只会打雷的精灵，面对 8 格外的一只僵尸；`rain` 让天雷必中，用来稳定验证“落雷命中并造成伤害”。
 * 必然事实：本招被提交过；目标受到过伤害（雨天命中率为 100%）。
 * 是否把目标麻痹、落点半径与雷柱粗细属于概率与体型结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("thunder", function (stage) {
    stage.weather("rain");
    var caster = stage.pokemon({ species: "Electabuzz", level: 40, moves: ["thunder"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("thunder") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("thunder") > 0, "thunder was committed");
        stage.expect(stage.damageTo(foe) > 0, "the bolt dealt damage in the rain");
        stage.note("thunder observations", { casts: stage.casts("thunder"), onFoe: stage.damageTo(foe),
            paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis") });
        stage.done();
    }, "thunder strikes");
});
