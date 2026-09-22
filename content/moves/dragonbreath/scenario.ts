/**
 * 龙息的可执行设计说明。
 *
 * 场面：一只只会龙息的精灵，正前方 3 格与 5 格各站一只僵尸（第二个略微偏侧），用来读扇形能不能一次扫到两个。
 * 必然事实：本招被提交过；至少一个敌人受到过伤害。
 * 一次扫到几个、谁被麻住属于站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonbreath", function (stage) {
    var caster = stage.pokemon({ species: "Dragonair", level: 36, moves: ["dragonbreath"], at: [0, 0, 0] });
    var first = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var second = stage.mob({ type: "minecraft:zombie", at: [5, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("dragonbreath") > 0 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("dragonbreath") > 0, "dragonbreath was committed");
        stage.expect(stage.damageTo(first) + stage.damageTo(second) > 0, "the breath dealt damage");
        stage.note("dragonbreath observations", { casts: stage.casts("dragonbreath"), onFirst: stage.damageTo(first), onSecond: stage.damageTo(second),
            paralyticFirst: stage.hadMobEffect(first, "world_combat:status/paralysis"), paralyticSecond: stage.hadMobEffect(second, "world_combat:status/paralysis") });
        stage.done();
    }, "dragonbreath lands");
});
