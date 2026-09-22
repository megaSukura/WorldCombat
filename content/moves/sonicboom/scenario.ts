/**
 * 音爆的可执行设计说明。
 *
 * 场面：一只会音爆的小磁怪（Magnemite，25 级），面对 6 格外一只只带跃起、不还手的果然翁（Wobbuffet，36 级）。
 * 必然事实：本招被提交过；目标受到过伤害。
 * 固定伤害是否正好 20、有没有把人推开、裂痕在哪儿被挡住，写进 note 供读轨迹判断。
 */
Smoke.scenario("sonicboom", function (stage) {
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Magnemite", level: 25, moves: ["sonicboom"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Wobbuffet", level: 36, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("sonicboom", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("sonicboom", caster) > 0, "sonicboom was committed");
        stage.expect(stage.damageTo(foe) > 0, "the sonic crack dealt its fixed damage");
        stage.note("音爆即时结算，伤害恒为 20，不由施法者的攻击、目标的防御或相性改变（只有属性免疫能挡住）。"
            + "本场读实际伤害是否落在 20，以及目标是否被推开。",
            { casts: stage.casts("sonicboom", caster), damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10, foeAlive: foe.alive(),
                foeHealth: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "sonic boom lands its fixed 20");
});
