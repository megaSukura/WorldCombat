/**
 * 诡计 的可执行设计说明。
 *
 * 场面：一只只会「诡计」的凯西（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先起念。施术前先由外部来源垫一档持久特攻（stage.boost，须在角色绑定后），用来验证本招窗口只撤自己那一份。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/nastyplot 的诡计窗口；
 *   窗口结束或清除后，外部那档持久特攻原样保留、不被误扣。特攻具体抬了几级、窗口多长写进 note。
 */
Smoke.scenario("nastyplot", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 24, moves: ["nastyplot"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.after(3, function () {
        // 外部来源的一档持久特攻：本招窗口结束时它必须还在。
        stage.boost(caster, { spa: 2 });
        var prepared = stage.stages(caster);
        stage.expect(prepared.spa === 2, "the external +2 ladder is installed after actor binding");
        stage.until(1200, function () {
            return stage.casts("nastyplot", caster) > 0
                && stage.hadMobEffect(caster, "world_combat:status/nastyplot");
        }, function () {
            stage.expect(stage.casts("nastyplot", caster) > 0, "nasty plot was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/nastyplot"), "the scheme window carried the shared identity");
            const raised = stage.stages(caster);
            stage.expect(raised.spa === 4, "the owned scheme window adds its stages on top of the external +2");
            stage.note("A visible scheme window owns this move's Sp. Atk stages; an external source already held +2.", { stages: raised });
            stage.setPp(caster, "nastyplot", 0);
            stage.until(900, function () {
                return !stage.hasMobEffect(caster, "world_combat:status/nastyplot");
            }, function () {
                const after = stage.stages(caster);
                stage.expect(after.spa === 2, "the scheme window took back only its own stages, leaving the external +2");
                stage.note("The owned window expired without deducting the other source's Sp. Atk.", {
                    stages: after,
                    casts: stage.casts("nastyplot", caster),
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                    casterAlive: caster.alive()
                });
                stage.done();
            }, "nasty plot releases only its own stages");
        }, "nasty plot engages");
    });
});
