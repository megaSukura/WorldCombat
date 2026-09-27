/**
 * 诡计 的可执行设计说明。
 *
 * 场面：一只只会「诡计」与一记特殊招（混乱）的凯西（24 级）与一只被点住的铁傀儡隔开 9 格、石质场地上开战；
 *   混乱由 unit.json 的 scenarioFixtures 装配，AI 才能从当前决策帧读到一记真正就绪、射程可达的特殊输出，
 *   本招才被排进出手计划。施术前先由外部来源垫一档持久特攻（stage.boost，须在角色绑定后），用来验证本招窗口只撤自己那一份。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/nastyplot 的诡计窗口；短窗口不会被一次
 *   敌对直接打击提前打散；窗口自己走完后只收回本招抬起的级数，外部那档持久特攻原样保留。抬了几级、窗口多长写进 note。
 *   对手是普通 MC 生物，说明本招对任意敌对活体成立。
 */
Smoke.scenario("nastyplot", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 24, moves: ["nastyplot", "confusion"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [6, 0, 0] });
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
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/nastyplot"), "the short scheme window carried the shared identity");
            const raised = stage.stages(caster);
            stage.expect(raised.spa === 4, "the owned scheme window adds its stages on top of the external +2");
            // 窗口只由自身时长与清除决定：一次敌对直接打击不会提前打散它。
            stage.hurt(caster, 1, "minecraft:magic", { source: foe });
            stage.after(2, function () {
                stage.expect(stage.hasMobEffect(caster, "world_combat:status/nastyplot"),
                    "a direct hostile hit does not dispel the short window");
                // 阻止重施，让短窗口自己走完，确认只收回本招那一份。
                stage.setPp(caster, "nastyplot", 0);
                stage.until(400, function () { return !stage.hasMobEffect(caster, "world_combat:status/nastyplot"); }, function () {
                    const after = stage.stages(caster);
                    stage.expect(after.spa === 2, "the short scheme window took back only its own stages, leaving the external +2");
                    stage.note("A short scheme window owns this move's Sp. Atk stages; it lasts only its own duration and a direct hostile hit does not dispel it, while an external +2 stays after it ends.", {
                        stages: after,
                        casts: stage.casts("nastyplot", caster),
                        damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                        damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                        casterAlive: caster.alive()
                    });
                    stage.done();
                }, "the short scheme window expires on its own");
            });
        }, "nasty plot engages");
    });
});
