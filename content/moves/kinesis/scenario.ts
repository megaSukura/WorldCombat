// 折弯汤匙的可执行设计说明：一只超能力系宝可梦隔着一段距离对一个僵尸只说这一招，中间没有掩体。
// 必然事实：折弯汤匙被放出来过；通视的目标带上共享的「被引开注意」身份；它的命中等级随之走低（由绑在载体上的 boostWindow 写入）。
// 折弯要几刻（过程中始终要求通视）、被掩体挡住而落空、命中瞬间的随机结果都不是必然事实，写进 note 供读轨迹判断。
Smoke.scenario("kinesis", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "kadabra", level: 45, moves: ["kinesis"], at: [-2, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("kinesis", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/beguiled");
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("kinesis", caster) > 0, "kinesis was committed");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/beguiled"), "the target carried the shared beguiled identity");
            stage.expect((stage.stages(target).accuracy || 0) < 0, "the beguiled target's accuracy stage fell through the carrier-bound window");
            stage.note("the accuracy drop is a boostWindow bound to the beguiled carrier and reverts when it expires or is cured; the 15% physical direct-attack suppression goes through the shared incoming rule for every entity, not only native attack_damage. Bending takes several ticks and needs line of sight (measured at the real eyes) throughout; a wall mid-bend or leaving the gaze range fizzles it", {
                casts: stage.casts("kinesis", caster),
                accuracyStage: stage.stages(target).accuracy || 0,
                casterHp: caster.health(), targetHp: target.health()
            });
            stage.done();
        });
    }, "kinesis lands on the target");
});
