/**
 * 下盘踢的可执行设计说明。
 *
 * 场面：一只只会下盘踢的格斗宝可梦（Machop），面对两格外的 Snorlax。压低重心、拧腰低扫。
 * 必然事实：本招被提交过；目标被扫中并受到伤害；目标身上出现过共享身份 hobbled。
 * 掉速级数（读目标当前移动速度）与是否把腿别住，写进 note 供读轨迹判断。
 */
Smoke.scenario("lowsweep", function (stage) {
    const caster = stage.pokemon({ species: "Machop", level: 30, moves: ["lowsweep"], at: [0, 0, 0] });
    const foe = stage.pokemon({ species: "Snorlax", level: 18, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("lowsweep", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/hobbled");
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("lowsweep", caster) > 0, "lowsweep was committed");
            stage.expect(stage.damageTo(foe) > 0, "the low sweep dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/hobbled"), "the target was hobbled");
            stage.note("hobbled is a timed identity; the Speed drop uses shared speed stages and reads the target's movement", {
                casts: stage.casts("lowsweep", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "lowsweep lands");
});
