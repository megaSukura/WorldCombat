/**
 * 聚气 / focusenergy 的可执行设计说明。
 *
 * 场面：一只只会「聚气」的腕力（Machop，30 级）与一只弱小的小拉达隔开 7 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先吸一口气。有威胁且在考虑距离内、还没贴身时，它会先聚气再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/focusenergy 的吐纳窗口。
 *   附加比例、深化时长、命中兑现了几次以及是否真的打出要害都带随机与时序，写进 note 供读轨迹判断。
 */
Smoke.scenario("focusenergy", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 30, moves: ["focusenergy"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("focusenergy", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/focusenergy");
    }, function () {
        stage.expect(stage.casts("focusenergy", caster) > 0, "focus energy was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/focusenergy"), "the focus breath carried the shared identity");
        stage.after(120, function () {
            stage.note("吐纳窗口走完即散，命中不消耗它：带身份者每次伤害结算按「已深化比例」抬升附加要害概率（满气附加比例 edge 由速度与特攻派生）。是否真的打出要害是随机结果，读轨迹与完整装配试玩核对；深呼吸与浅呼吸各有代价。", {
                casts: stage.casts("focusenergy", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "focus energy begins");
});
