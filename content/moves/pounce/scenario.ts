/**
 * 虫扑的可执行设计说明。
 *
 * 场面：一只只会虫扑的小型虫系宝可梦（Joltik），对四格外的对手。它沿抛物线扑上去、落在目标身上。
 * 必然事实：本招被提交过；目标受到过扑击伤害；目标身上出现过共享身份 clung。
 * 是否命中（抛物线可能扑空）、缠身级数与落地位移，写进 note 供读轨迹判断。
 */
Smoke.scenario("pounce", function (stage) {
    const caster = stage.pokemon({ species: "Joltik", level: 34, moves: ["pounce"], at: [0, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("pounce", caster) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, "world_combat:status/clung");
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("pounce", caster) > 0, "pounce was committed");
            stage.expect(stage.damageTo(foe) > 0, "the pounce dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/clung"), "the target was clung");
            stage.note("clung is a timed identity; the Speed drop uses shared speed stages", {
                casts: stage.casts("pounce", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "pounce lands");
});
