// 寄生种子的可执行设计说明：让一只只会寄生种子的宝可梦对一名只会撞击的对手撒种。
// 必然事实：寄生种子被提交过；目标身上出现过共享身份 world_combat:status/leechseed；
//   之后定时抽取把目标的生命抽掉（damageTo(target) 增长）——这证明根真的在按自己的钟结算。
// 随机结果（第一口在窗口里的哪一刻落下、实际抽量）写进 note 供读轨迹判断。
Smoke.scenario("leechseed", function (stage) {
    var caster = stage.pokemon({ species: "bulbasaur", level: 42, moves: ["leechseed"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: bulbasaur(42) leechseed vs machop(26) tackle at 6 blocks; the seed should root and drain on its own clock");
    stage.until(1200, function () {
        return stage.casts("leechseed", caster) >= 1 && stage.hadMobEffect(target, "world_combat:status/leechseed");
    }, function () {
        stage.expect(stage.casts("leechseed", caster) >= 1, "leechseed was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/leechseed"), "the shared leechseed identity was applied to the target");
        var before = target.health();
        stage.until(900, function () { return stage.damageTo(target) > 0; }, function () {
            stage.expect(stage.damageTo(target) > 0, "the root drained the target after rooting");
            stage.note("seed rooted and drained on its own clock; it ends on its own timer or when cured", {
                casts: stage.casts("leechseed", caster), damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                targetHpBefore: before, targetHpAfter: target.health()
            });
            stage.done();
        }, "the seed drains");
    }, "leechseed roots the target");
});
