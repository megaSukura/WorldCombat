/**
 * 终极冲击的可执行设计说明。
 *
 * 场面：一头重（Tauros）对一头更重（Snorlax），相隔 3 格开战，双方都只会这一招。
 * 必然事实：本招被提交过；造成过伤害；施法者进入力竭（共享身份 mustrecharge）；力竭期间无法再提交新动作。
 * 命中与否、暴击、力竭具体多长、被顶开多少都是随机／个体结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("gigaimpact", function (stage) {
    var a = stage.pokemon({ species: "Tauros", level: 40, moves: ["gigaimpact"], at: [-2, 0, 0] });
    var b = stage.pokemon({ species: "Snorlax", level: 40, moves: ["gigaimpact"], at: [1, 0, 0] });
    stage.hostile(a, b);
    stage.until(1200, function () {
        return stage.casts("gigaimpact") > 0
            && (stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"))
            && stage.damageTo(a) + stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("gigaimpact") > 0, "gigaimpact was committed");
        stage.expect(stage.damageTo(a) + stage.damageTo(b) > 0, "gigaimpact dealt damage");
        stage.expect(stage.hadMobEffect(a, "world_combat:status/mustrecharge") || stage.hadMobEffect(b, "world_combat:status/mustrecharge"),
            "the caster entered the mustrecharge window");
        var recharging = stage.hasMobEffect(a, "world_combat:status/mustrecharge") ? a : b;
        var before = stage.casts("gigaimpact", recharging);
        stage.note("gigaimpact exchange", { casts: stage.casts("gigaimpact"), onA: stage.damageTo(a), onB: stage.damageTo(b),
            movedA: Math.round(stage.travelled(a) * 10) / 10, movedB: Math.round(stage.travelled(b) * 10) / 10,
            rechargingTravelled: Math.round(stage.travelled(recharging) * 10) / 10 });
        stage.after(12, function () {
            stage.expect(stage.casts("gigaimpact", recharging) === before, "no new action committed while recharging");
            stage.done();
        });
    }, "gigaimpact lands");
});
