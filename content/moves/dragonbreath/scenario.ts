/**
 * 龙息的可执行设计说明。
 *
 * 场面：一只只会龙息的精灵，正前方 3 格与 5 格各站一只僵尸（第二个略微偏侧），用来读扇形能不能一次扫到两个。
 * 必然事实：本招被提交过；这一口龙息本身造成了伤害（按 `world_combat.action` 的来源伤害计，避免把环境火力算进来）；
 * **近处与远处的两只都被前沿抵达并扫到**，且每只在一发里至多被扫一次（`hits(actor, true) <= casts`）。
 * 一次扫到几个、谁被麻住属于站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonbreath", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Dragonair", level: 36, moves: ["dragonbreath"], at: [0, 0, 0] });
    var first = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var second = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0.8] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("dragonbreath") > 0 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0;
    }, function () {
        // 前沿由近及远推进：等最远的一只也被扫到，再多等几拍确认没有重复结算。
        stage.after(26, function () {
            var dealt = 0, events = stage.damageEvents("world_combat.action");
            for (var i = 0; i < events.length; i++) dealt += events[i].amount;
            var casts = stage.casts("dragonbreath");
            stage.expect(casts > 0, "dragonbreath was committed");
            stage.expect(dealt > 0, "the breath dealt damage");
            stage.expect(stage.damageTo(first) > 0 && stage.damageTo(second) > 0, "the advancing cone reached both bodies ahead");
            stage.expect(stage.hits(first, true) <= casts && stage.hits(second, true) <= casts, "each body is swept at most once per cast");
            stage.note("dragonbreath observations", { casts: casts, moveDamage: dealt, onFirst: stage.damageTo(first), onSecond: stage.damageTo(second),
                hitsFirst: stage.hits(first, true), hitsSecond: stage.hits(second, true),
                paralyticFirst: stage.hadMobEffect(first, "world_combat:status/paralysis"), paralyticSecond: stage.hadMobEffect(second, "world_combat:status/paralysis") });
            stage.done();
        });
    }, "dragonbreath cast and the frontier reached both");
});
