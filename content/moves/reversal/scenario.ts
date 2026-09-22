/**
 * 起死回生的可执行设计说明。
 *
 * 场面：一只只会起死回生的格斗系精灵（腕力，30 级）面对 3 格外的一只僵尸；设为夜晚，避免僵尸被日光灼烧，
 * 伤害只可能来自这招。两者开战，AI 只有这一招可用，会扑上去掀起喷发。
 * 必然事实：本招被提交过；目标受到过伤害（喷发圈扫到对手）。
 * 具体威力随施法者当前生命比例变化，喷发是否扫到、暴击与否写进 note 供读轨迹判断。
 */
Smoke.scenario("reversal", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Machop", level: 30, moves: ["reversal"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("reversal") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("reversal") > 0, "reversal was committed");
            stage.expect(stage.damageTo(foe) > 0, "the reversal burst hit the target");
            stage.note("reversal observations", { casts: stage.casts("reversal"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                casterHealth: Math.round(caster.health() * 10) / 10, casterMax: Math.round(stage.attribute(caster, "minecraft:generic.max_health") * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10 });
            stage.done();
        });
    }, "reversal lands");
});
