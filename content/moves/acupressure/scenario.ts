/**
 * 点穴 的可执行设计说明。
 *
 * 场面：一只只会「点穴」的腕力（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先按自己（默认配置允许把自己算作友方；身边有同伴时会优先按同伴）。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/acupressure 的通畅窗口。
 *   随机命中了哪一项、抬了几级、窗口多长写进 note 供读轨迹判断（私有装配读不到原生能力等级）。
 */
Smoke.scenario("acupressure", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 24, moves: ["acupressure"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("acupressure", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/acupressure");
    }, function () {
        stage.expect(stage.casts("acupressure", caster) > 0, "acupressure was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/acupressure"), "the flow window carried the shared identity");
        stage.after(80, function () {
            stage.note("one open stat among the target's not-yet-maxed stats is rolled and raised by the press value; the stat and its stage are native for a Pokemon and unreadable here, and the mark takes it back by name and count when the window ends.", {
                casts: stage.casts("acupressure", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "acupressure engages");
});
