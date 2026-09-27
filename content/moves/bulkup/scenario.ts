/**
 * 健美 的可执行设计说明。
 *
 * 场面：一只只会「健美」的腕力（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先绷紧一轮。这里再验证一次载体的所有权：驱散一次 surge 载体，本来源的攻防一起收回，
 *   而另一处与本招无关的提升保留。
 * 必然事实：本招被提交过；共享身份 world_combat:status/bulkup 的 surge 窗口出现；物攻与防御都因本来源提升；
 *   驱散载体后两项回到 0，加在特攻上的无关提升仍在。具体级数与窗口写进 note 供读轨迹。
 */
Smoke.scenario("bulkup", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 24, moves: ["bulkup"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("bulkup", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/bulkup")
            && stage.stages(caster).atk >= 1 && stage.stages(caster).def >= 1;
    }, function () {
        stage.expect(stage.casts("bulkup", caster) > 0, "bulk up was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/bulkup"), "the surge window carried the shared identity");
        var after = stage.stages(caster);
        stage.expect(after.atk >= 1 && after.def >= 1, "this source raised both Attack and Defense");
        stage.boost(caster, { spa: 1 });
        var unrelated = stage.stages(caster).spa;
        stage.team("bulkup_subject", [caster]);
        stage.command("effect clear @e[team=bulkup_subject] world_combat:bulkup_surge");
        stage.after(8, function () {
            var final = stage.stages(caster);
            stage.expect(final.atk <= 0 && final.def <= 0, "dispelling the carrier took back this source's whole contribution");
            stage.expect(stage.stages(caster).spa >= unrelated - 0.001, "an unrelated boost stayed");
            stage.note("bulk up: the surge carrier owns the whole window; dispelling it once retracts this source's Attack/Defense while an unrelated boost stays", {
                casts: stage.casts("bulkup", caster),
                afterBoost: after,
                afterDispel: final,
                unrelated: unrelated,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "bulk up engages");
});
