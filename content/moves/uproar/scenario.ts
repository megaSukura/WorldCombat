// 吵闹的可执行设计说明：一只只会吵闹的宝可梦对两只贴身的僵尸连喊。
// 必然事实：本招被提交过；施法者身上出现过共享身份 uproar（止眠的凭据）；
//   声浪对圈内的僵尸造成过伤害（多段结算里至少命中一次）。
// 命中率、每圈震到几只、共喊了几次写进 note 供读轨迹判断。
Smoke.scenario("uproar", function (stage) {
    var caster = stage.pokemon({ species: "exploud", level: 40, moves: ["uproar"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [4, 0, 1] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("uproar") > 0 && stage.damageTo(foeA) > 0;
    }, function () {
        stage.after(120, function () {
            stage.expect(stage.casts("uproar") > 0, "uproar was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/uproar"), "the shouter carried the shared uproar identity");
            stage.expect(stage.damageTo(foeA) > 0, "the sound waves damaged the first zombie");
            stage.note("uproar rings", {
                casts: stage.casts("uproar"),
                onA: Math.round(stage.damageTo(foeA) * 10) / 10,
                onB: Math.round(stage.damageTo(foeB) * 10) / 10,
                voice: stage.hadMobEffect(caster, "world_combat:status/uproar"),
                movedCaster: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "uproar rings out");
});
