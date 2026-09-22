/**
 * 抓狂 / flail 的可执行设计说明。
 *
 * 场面：一只只会抓狂的近战精灵，面对 2 格外的一只尸壳。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（乱打命中）。
 * 具体甩出几段、是否把僵尸挤开、以及随机暴击，都写进 note 供读轨迹判断。
 */
Smoke.scenario("flail", function (stage) {
    var caster = stage.pokemon({ species: "Primeape", level: 32, moves: ["flail"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:husk", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("flail") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flail") > 0, "flail was committed");
        stage.expect(stage.damageTo(foe) > 0, "the flail dealt damage");
        stage.note("flail observations", { casts: stage.casts("flail"), onFoe: stage.damageTo(foe),
            casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.done();
    }, "flail lands");
});
