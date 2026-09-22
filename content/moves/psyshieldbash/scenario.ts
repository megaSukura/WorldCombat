/**
 * 屏障猛攻的可执行设计说明。
 *
 * 场面：一只特攻取向的精灵（Stantler）对 3 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，伤害只来自这一撞。
 * 双方敌对，AI 只有这一招可用。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 `world_combat:status/psyshield`（护盾成形即挂，撞空也有）；
 * 多放几次后目标受到过伤害（命中 90，偏角是随机结果，写进 note）。
 * 偏角是否让某一发落空、暴击、防御等级，都写进 note 供读轨迹判断。
 */
Smoke.scenario("psyshieldbash", function (stage) {
    stage.time("night");
    var shell = "world_combat:status/psyshield";
    var caster = stage.pokemon({ species: "Stantler", level: 32, moves: ["psyshieldbash"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("psyshieldbash") > 0 && stage.hadMobEffect(caster, shell)
            && (stage.damageTo(foe) > 0 || stage.casts("psyshieldbash") >= 4);
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("psyshieldbash") > 0, "psyshieldbash was committed");
            stage.expect(stage.hadMobEffect(caster, shell), "the shield identity was applied to the caster");
            stage.expect(stage.damageTo(foe) > 0, "the shielded slam dealt damage over the exchange");
            stage.note("psyshieldbash observations", { casts: stage.casts("psyshieldbash"), onFoe: stage.damageTo(foe),
                shell: stage.hadMobEffect(caster, shell), moved: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        });
    }, "psyshieldbash lands and shells");
});
