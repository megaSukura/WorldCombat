/**
 * 磨爪 / honeclaws 的可执行设计说明。
 *
 * 场面：一只只会「磨爪」的狃拉与一只弱小的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先磨爪。有威胁且在磨爪距离内时，它会先磨一轮再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/honeclaws 的锋口窗口；
 *   公共能力阶梯上物攻与命中各自真的被抬高了至少一级（boostWindow 的贡献可被 stage.stages 读到）。
 */
Smoke.scenario("honeclaws", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sneasel", level: 32, moves: ["honeclaws"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("honeclaws", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/honeclaws");
    }, function () {
        stage.expect(stage.casts("honeclaws", caster) > 0, "hone claws was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/honeclaws"), "the edge window carried the shared identity");
        const stages = stage.stages(caster);
        stage.expect((stages.atk || 0) >= 1, "hone claws really raised Attack on the shared ladder");
        stage.expect((stages.accuracy || 0) >= 1, "hone claws really raised accuracy on the shared ladder");
        stage.after(80, function () {
            stage.note("the edge window length and how much the window takes back are design facts read here; the ladder gain is asserted above", {
                casts: stage.casts("honeclaws", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "hone claws engages");
});
