/**
 * 毒液冲击的可执行设计说明。
 *
 * 场面：一只耿鬼在 9 格外的对一只开场就中毒的卡比兽泼毒。目标带着毒，是这招翻倍并升格为剧毒的条件，
 * 因此开场就把 native 状态设成 poison，让共享身份 world_combat:status/poison 先成立；距离在射程内，AI 会直接出手。
 * 必然事实：本招被提交过；卡比兽受到过毒液冲击的伤害。
 * 命中、毒性是否先于出手完成镜射、以及是否升格为剧毒写进 note，供读轨迹判断。
 */
Smoke.scenario("venoshock", function (stage) {
    var caster = stage.pokemon({ species: "Gengar", level: 30, moves: ["venoshock"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 40, moves: [], at: [3, 0, 0], status: "poison" });
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("venoshock") > 0 && stage.damageBy(caster) > 0;
    }, function () {
        stage.expect(stage.casts("venoshock") > 0, "venoshock was committed");
        stage.expect(stage.damageBy(caster) > 0, "venoshock dealt damage");
        stage.note("venoshock observations", {
            casts: stage.casts("venoshock"), onTarget: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hasMobEffect(target, "world_combat:status/poison"),
            toxic: stage.hasMobEffect(target, "world_combat:status/toxic"),
            moved: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "venoshock hits");
});
