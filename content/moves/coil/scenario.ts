/**
 * 盘蜷 / coil 的可执行设计说明。
 *
 * 场面：一只只会「盘蜷」的阿柏蛇与一只弱小的小拉达隔开 11 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先盘一圈。有威胁且在盘蜷距离内、还没贴身时，它会先盘紧再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/coil 的盘势窗口。
 *   攻/防/命中各抬了几级、盘势撑多久、窗口结束时按记号收回多少写进 note 供读轨迹判断
 *   （私有装配没有读取原生能力等级的读取原语，因此不断言级数）。
 */
Smoke.scenario("coil", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ekans", level: 34, moves: ["coil"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("coil", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/coil");
    }, function () {
        stage.expect(stage.casts("coil", caster) > 0, "coil was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/coil"), "the brace window carried the shared identity");
        stage.after(80, function () {
            stage.note("the rise/guard/focus stages, the brace window length and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("coil", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "coil engages");
});
