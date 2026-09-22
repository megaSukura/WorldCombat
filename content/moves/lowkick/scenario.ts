/**
 * 踢倒的可执行设计说明。
 *
 * 场面：一只只会踢倒的格斗精灵（Machop），面对 2 格外一只笨重缓慢的 Snorlax。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被扫中并受到伤害；目标身上出现过 tripped 身份。
 * 是否命中、有没有顺手带倒第二名敌人（扫堂式才开），都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("lowkick", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 34, moves: ["lowkick"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("lowkick") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("lowkick") > 0, "lowkick was committed");
            stage.expect(stage.damageTo(foe) > 0, "the low kick dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/tripped"), "the target was tripped");
            stage.note("lowkick observations", { casts: stage.casts("lowkick"), onFoe: stage.damageTo(foe),
                tripped: stage.hadMobEffect(foe, "world_combat:status/tripped"),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster) });
            stage.done();
        });
    }, "lowkick lands");
});
