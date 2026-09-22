/**
 * 巨龙威能 / dragonenergy 的可执行设计说明。
 *
 * 场面：一只只会巨龙威能的精灵，面对正前方 6 格外的一只铁傀儡（龙息是前向锥，需要目标在视线里）。
 * 两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（龙息命中）。
 * 一喷贯穿几个、以及暴击，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonenergy", function (stage) {
    var caster = stage.pokemon({ species: "Dragonite", level: 50, moves: ["dragonenergy"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("dragonenergy") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("dragonenergy") > 0, "dragonenergy was committed");
        stage.expect(stage.damageTo(foe) > 0, "the dragon breath dealt damage");
        stage.note("dragonenergy observations", { casts: stage.casts("dragonenergy"), onFoe: stage.damageTo(foe),
            casterHealth: Math.round(caster.health() * 10) / 10, foeHealth: Math.round(foe.health() * 10) / 10 });
        stage.done();
    }, "dragonenergy lands");
});
