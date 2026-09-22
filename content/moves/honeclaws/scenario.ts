/**
 * 磨爪 / honeclaws 的可执行设计说明。
 *
 * 场面：一只只会「磨爪」的狃拉与一只弱小的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先磨爪。有威胁且在磨爪距离内时，它会先磨一轮再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/honeclaws 的锋口窗口。
 *   物攻与命中各抬了几级、锋口撑多久、窗口结束时按记号收回多少写进 note 供读轨迹判断
 *   （私有装配没有读取原生能力等级的读取原语，因此不断言级数）。
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
        stage.after(80, function () {
            stage.note("the rise/focus stages, the edge window length and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("honeclaws", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "hone claws engages");
});
