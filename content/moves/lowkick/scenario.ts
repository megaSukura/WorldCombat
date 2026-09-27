/**
 * 踢倒的可执行设计说明。
 *
 * 场面：一只只会踢倒的格斗精灵（Machop），面对 2 格外一只笨重缓慢的 Snorlax。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被扫中并受到伤害；目标身上出现过 tripped 身份。
 * 是否命中、有没有顺手带倒第二名敌人（扫堂式才开），都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("lowkick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Machop", level: 34, moves: ["lowkick"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.setPp(caster, "lowkick", 0);
    stage.after(20, function () { stage.setPp(caster, "lowkick", 1); });
    stage.until(900, function () {
        return stage.casts("lowkick") > 0 && stage.damageTo(foe) > 0 && stage.hasMobEffect(foe, "world_combat:lowkick_stagger");
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("lowkick") > 0, "lowkick was committed");
            stage.expect(stage.damageTo(foe) > 0, "the low kick dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/tripped"), "the target was tripped");
            stage.note("lowkick observations", { casts: stage.casts("lowkick"), onFoe: stage.damageTo(foe),
                tripped: stage.hadMobEffect(foe, "world_combat:status/tripped"),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster) });
            const timedTarget = foe;
        stage.expect(stage.hasMobEffect(timedTarget, "world_combat:lowkick_stagger"), "the actual timed carrier is still active");
        stage.expect((stage.stages(timedTarget).spe || 0) < 0, "the carrier owns an active ability change");
        stage.setPp(caster, "lowkick", 0);
        stage.team("timed-b-lowkick", [caster, timedTarget]);
        stage.boost(timedTarget, { spe: 1 });
        stage.command("effect clear " + timedTarget.ref.split("/")[0] + " world_combat:lowkick_stagger");
        stage.after(5, function () {
            stage.expect(!stage.hasMobEffect(timedTarget, "world_combat:lowkick_stagger"), "cleansing removes the timed carrier");
            stage.expect((stage.stages(timedTarget).spe || 0) === 1, "cleansing restores this move's contribution while preserving a separate +1");
            stage.done();
        });
        });
    }, "lowkick lands");
});
