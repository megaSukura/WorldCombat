/**
 * 爆炸烈焰的可执行设计说明。
 *
 * 场面：两只远程火系（Charizard 对 Typhlosion）相隔 6 格开战，双方都只会这一招。
 * 必然事实：本招被提交过；落点爆炸造成过伤害；施法者进入过热（共享身份 mustrecharge）；过热期间无法再提交新动作。
 * 命中、暴击、是否点燃、爆散范围与力竭时长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("blastburn", function (stage) {
    var a = stage.pokemon({ species: "Charizard", level: 45, moves: ["blastburn"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "Typhlosion", level: 45, moves: ["blastburn"], at: [3, 0, 0] });
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("blastburn") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("blastburn") > 0, "blastburn was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "the blast dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster entered the overheat window");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("blastburn", recharging);
        stage.note("blastburn exchange", { casts: stage.casts("blastburn"), onA: stage.damageTo(a), onB: stage.damageTo(b),
            burnedA: stage.hadMobEffect(a, "world_combat:status/burn"), burnedB: stage.hadMobEffect(b, "world_combat:status/burn") });
        stage.after(12, function () {
            stage.expect(stage.casts("blastburn", recharging) === before, "no new action committed while overheated");
            stage.done();
        });
    }, "blastburn lands");
});
