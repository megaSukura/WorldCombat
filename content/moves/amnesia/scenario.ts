/**
 * 瞬间失忆 的可执行设计说明。
 *
 * 场面：一只只会「瞬间失忆」的呆呆兽（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先放空。默认的「彻底失忆」起手更长，但也会把缠着心智的状态一次忘光。
 *   施术前先由外部来源垫一档持久特防（stage.boost，须在角色绑定后），用来验证本招窗口只撤自己那一份。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/amnesia 的空明窗口；
 *   窗口结束或清除后，外部那档持久特防原样保留、不被误扣。忘却结果写进 note（同装配没有心智异常生产方）。
 */
Smoke.scenario("amnesia", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "slowpoke", level: 24, moves: ["amnesia"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.after(3, function () {
        // 外部来源的一档持久特防：本招空明窗口结束时它必须还在。
        stage.boost(caster, { spd: 2 });
        stage.expect(stage.stages(caster).spd === 2, "the external +2 ladder is installed after actor binding");
        stage.until(1200, function () {
            return stage.casts("amnesia", caster) > 0
                && stage.hadMobEffect(caster, "world_combat:status/amnesia");
        }, function () {
            stage.expect(stage.casts("amnesia", caster) > 0, "amnesia was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/amnesia"), "the blank window carried the shared identity");
            const raised = stage.stages(caster);
            stage.expect(raised.spd === 4, "the owned blank window adds its stages on top of the external +2");
            stage.note("The blank window owns this move's Sp. Def stages; an external source already held +2. Forgetting targets shared mental-status identities, and this assembly has no producer of those conditions.", { stages: raised });
            stage.setPp(caster, "amnesia", 0);
            stage.until(900, function () {
                return !stage.hasMobEffect(caster, "world_combat:status/amnesia");
            }, function () {
                const after = stage.stages(caster);
                stage.expect(after.spd === 2, "the blank window took back only its own stages, leaving the external +2");
                stage.note("The owned Sp. Def window expired without deducting the other source's gain.", {
                    stages: after,
                    casts: stage.casts("amnesia", caster),
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                    casterAlive: caster.alive()
                });
                stage.done();
            }, "amnesia releases only its own stages");
        }, "amnesia engages");
    });
});
