/**
 * 加农水炮的可执行设计说明。
 *
 * 场面：两只都会加农水炮的水系（Blastoise 对 Empoleon）相隔 6 格开战，都只会这一招。
 * 必然事实：本招被提交过；水柱造成过伤害；命中的目标被泼上浸湿（共享身份 soaked）；施法者进入力竭
 * （共享身份 mustrecharge）；力竭期间无法再提交新动作。
 * 顶开多远、是否追加浸湿加成、暴击、力竭具体多长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("hydrocannon", function (stage) {
    var a = stage.pokemon({ species: "Blastoise", level: 45, moves: ["hydrocannon"], at: [-3, 0, 0] });
    var b = stage.pokemon({ species: "Empoleon", level: 45, moves: ["hydrocannon"], at: [3, 0, 0] });
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("hydrocannon") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("hydrocannon") > 0, "hydrocannon was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "the jet dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/soaked") || stage.hadMobEffect(b, "world_combat:status/soaked"),
            "the struck target was soaked");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster entered the spent window");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("hydrocannon", recharging);
        stage.note("hydrocannon exchange", { casts: stage.casts("hydrocannon"), onA: Math.round(stage.damageTo(a) * 10) / 10,
            onB: Math.round(stage.damageTo(b) * 10) / 10,
            soakedA: stage.hasMobEffect(a, "world_combat:status/soaked"), soakedB: stage.hasMobEffect(b, "world_combat:status/soaked") });
        stage.after(12, function () {
            stage.expect(stage.casts("hydrocannon", recharging) === before, "no new action committed while spent");
            stage.done();
        });
    }, "hydrocannon lands");
});
