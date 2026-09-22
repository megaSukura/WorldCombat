/**
 * 诡计 的可执行设计说明。
 *
 * 场面：一只只会「诡计」的凯西（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先起念。开启默认的「算计活人」时，面前有对手才走得动这条毒计。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/nastyplot 的诡计窗口。
 *   特攻抬了几级、窗口撑多久、结束时收回多少，以及随机过程写进 note 供读轨迹判断
 *   （私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("nastyplot", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 24, moves: ["nastyplot"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("nastyplot", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/nastyplot");
    }, function () {
        stage.expect(stage.casts("nastyplot", caster) > 0, "nasty plot was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/nastyplot"), "the scheme window carried the shared identity");
        stage.after(80, function () {
            stage.note("the wary choice sets Sp. Atk stages (+2 while a foe stands within reach, +1 behind closed doors); the stage is native for a Pokemon and unreadable here, and the window takes it back by its stored amplifier when it ends.", {
                casts: stage.casts("nastyplot", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "nasty plot engages");
});
