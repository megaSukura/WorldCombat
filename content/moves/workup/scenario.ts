/**
 * 自我激励的可执行设计说明。
 *
 * 场面：一只只会自我激励的利欧路与一只僵尸相隔 7 格开战。利欧路只会这一招，AI 会在威胁进入距离后先鼓劲。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/roused。
 * 这一下是否触发「背水」（生命掉到门槛以下、更高一侧多涨一级）随僵尸打中与否变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("workup", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Riolu", level: 30, moves: ["workup"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("workup", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/roused");
    }, function () {
        stage.expect(stage.casts("workup", caster) > 0, "workup was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/roused"), "the caster carried the shared roused identity");
        stage.note("workup observations", {
            casts: stage.casts("workup", caster),
            roused: stage.hadMobEffect(caster, "world_combat:status/roused"),
            health: Math.round(caster.health() * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "workup is cast");
});
