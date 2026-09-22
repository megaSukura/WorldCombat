/**
 * 流星突击的可执行设计说明。
 *
 * 场面：两只葱游兵（唯一学会此招的精灵）相隔 2 格开战，双方都只会这一招，正好贴在一起互相挥。
 * 必然事实：本招被提交过；扇形重挥造成过伤害；施法者进入晃晕（共享身份 mustrecharge）；晃晕期间无法再提交新动作。
 * 每段命中数、暴击、晃晕具体多长都是随机／个体／配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("meteorassault", function (stage) {
    var a = stage.pokemon({ species: "Sirfetchd", level: 45, moves: ["meteorassault"], at: [-1, 0, 0] });
    var b = stage.pokemon({ species: "Sirfetchd", level: 45, moves: ["meteorassault"], at: [1, 0, 0] });
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("meteorassault") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("meteorassault") > 0, "meteorassault was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "the sweeps dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster staggered itself");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("meteorassault", recharging);
        stage.note("meteorassault exchange", { casts: stage.casts("meteorassault"), onA: stage.damageTo(a), onB: stage.damageTo(b),
            movedA: Math.round(stage.travelled(a) * 10) / 10, movedB: Math.round(stage.travelled(b) * 10) / 10 });
        stage.after(12, function () {
            stage.expect(stage.casts("meteorassault", recharging) === before, "no new action committed while dazed");
            stage.done();
        });
    }, "meteorassault lands");
});
