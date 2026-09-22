/**
 * 迁怒的可执行设计说明。
 *
 * 场面：一只只会迁怒的精灵（小拉达，30 级）面对 3 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这招。两者开战，AI 只有这一招可用，会扑近后连续抓击。
 * 必然事实：本招被提交过；目标受到过伤害（连抓中至少有一爪抓实）。
 * 抓了几下、顶开了多远、暴击与否都是随位置与概率变化的结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("frustration", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Rattata", level: 30, moves: ["frustration"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("frustration") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("frustration") > 0, "frustration was committed");
            stage.expect(stage.damageTo(foe) > 0, "at least one rake of the flurry landed");
            stage.note("frustration observations", { casts: stage.casts("frustration"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10 });
            stage.done();
        });
    }, "frustration lands");
});
