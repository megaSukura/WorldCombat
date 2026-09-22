/**
 * 百万吨重踢的可执行设计说明。
 *
 * 场面：一只只会百万吨重踢的格斗精灵（Machop），面对 2.6 格外一只笨重缓慢的 Snorlax。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；施法者沿瞄准方向突进过；目标被踢中并受到伤害。
 * 是否命中、踢飞多远、有没有暴击，都是位置与随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("megakick", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 40, moves: ["megakick"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 20, moves: ["tackle"], at: [2.6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("megakick") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("megakick") > 0, "megakick was committed");
            stage.expect(stage.travelled(caster) > 0, "the caster drove forward");
            stage.expect(stage.damageTo(foe) > 0, "the megakick dealt damage");
            stage.note("megakick observations", { casts: stage.casts("megakick"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10, foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                hurtBack: Math.round(stage.damageTo(caster) * 10) / 10 });
            stage.done();
        });
    }, "megakick lands");
});
