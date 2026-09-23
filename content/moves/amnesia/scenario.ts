/**
 * 瞬间失忆 的可执行设计说明。
 *
 * 场面：一只只会「瞬间失忆」的呆呆兽（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先放空。默认的「彻底失忆」起手更长，但也会把缠着心智的状态一次忘光。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/amnesia 的空明窗口。
 *   特防与忘却结果写进 note；同装配没有心智异常生产方。
 */
Smoke.scenario("amnesia", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "slowpoke", level: 24, moves: ["amnesia"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("amnesia", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/amnesia");
    }, function () {
        stage.expect(stage.casts("amnesia", caster) > 0, "amnesia was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/amnesia"), "the blank window carried the shared identity");
        stage.after(80, function () {
            stage.note("The owned Sp. Def window ends with its blank status. Forgetting targets shared mental-status identities; this assembly has no producer of those conditions.", {
                stages: stage.stages(caster),
                casts: stage.casts("amnesia", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "amnesia engages");
});
