/**
 * 龙息的可执行设计说明。
 *
 * 场面：一只只会龙息的精灵，正前方 3 格与 5 格各站一只僵尸（第二个略微偏侧），用来读扇形能不能一次扫到两个。
 * 必然事实：本招被提交过；这一口龙息本身造成了伤害（按 `world_combat.action` 的来源伤害计，避免把环境火力算进来）。
 * 一次扫到几个、谁被麻住属于站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonbreath", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Dragonair", level: 36, moves: ["dragonbreath"], at: [0, 0, 0] });
    var first = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var second = stage.mob({ type: "minecraft:zombie", at: [5, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("dragonbreath") > 0;
    }, function () {
        // 锥面由近及远铺开需要时间，等它铺完再判定。
        stage.after(30, function () {
            var dealt = 0, events = stage.damageEvents("world_combat.action");
            for (var i = 0; i < events.length; i++) dealt += events[i].amount;
            stage.expect(stage.casts("dragonbreath") > 0, "dragonbreath was committed");
            stage.expect(dealt > 0, "the breath dealt damage");
            stage.note("dragonbreath observations", { casts: stage.casts("dragonbreath"), moveDamage: dealt, onFirst: stage.damageTo(first), onSecond: stage.damageTo(second),
                paralyticFirst: stage.hadMobEffect(first, "world_combat:status/paralysis"), paralyticSecond: stage.hadMobEffect(second, "world_combat:status/paralysis") });
            stage.done();
        });
    }, "dragonbreath cast");
});
