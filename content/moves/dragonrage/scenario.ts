/**
 * 龙之怒的可执行设计说明。
 *
 * 场面：一只会龙之怒的迷你龙（Dratini，20 级），面对 5 格外一只只带跃起、不还手的果然翁（Wobbuffet，36 级，
 * 生命足够高，方便读固定伤害的数值）。
 * 必然事实：本招被提交过；目标受到过伤害，且实际结算正好是固定 40（Wobbuffet 不免疫龙属性）。
 * 有没有把人撞退写进 note 供读轨迹判断（撞退走原生受击位移，属设计结果，不是断言对象）。
 */
Smoke.scenario("dragonrage", function (stage) {
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Dratini", level: 20, moves: ["dragonrage"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("dragonrage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("dragonrage", caster) > 0, "dragonrage was committed");
        stage.expect(stage.damageTo(foe) > 0, "the shock wave of rage dealt its fixed damage");
        stage.expect(Math.abs(stage.damageTo(foe) - 40) < 0.01, "the settled fixed damage was exactly 40");
        stage.note("龙之怒的伤害恒为 40，不由施法者的攻击、目标的防御或相性改变（只有属性免疫能挡住）。"
            + "本场读实际伤害是否落在 40，以及目标是否被原生受击位移撞退（抗击退目标不动，属设计结果）。",
            { casts: stage.casts("dragonrage", caster), damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10, foeAlive: foe.alive(),
                foeHealth: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "dragon rage lands its fixed 40");
});
