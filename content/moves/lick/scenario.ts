/**
 * 舌舔的可执行设计说明。
 *
 * 场面：一只只会舌舔的精灵，面对 2 格外的一只僵尸（正好在普通近战边缘、长舌够得到的距离）。
 * 必然事实：本招被提交过；目标受到过伤害（长舌命中）。
 * 是否把目标麻痹、缠绕式是否拽动目标属于概率与配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("lick", function (stage) {
    var caster = stage.pokemon({ species: "Lickitung", level: 30, moves: ["lick"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("lick") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("lick") > 0, "lick was committed");
        stage.expect(stage.damageTo(foe) > 0, "the tongue dealt damage");
        stage.note("lick observations", { casts: stage.casts("lick"), onFoe: stage.damageTo(foe),
            paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis") });
        stage.done();
    }, "lick lands");
});
