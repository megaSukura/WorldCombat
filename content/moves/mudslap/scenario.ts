/**
 * 掷泥的可执行设计说明。
 *
 * 场面：一只只会掷泥的施法者，对八格外的对手。泥团会抛过去、命中并溅开。
 * 必然事实：本招被提交过；对手受到过掷泥伤害（等到命中再结算，泥团是会被走位躲开的抛掷物）。
 * 命中下降的级数（共享 accuracy 能力等级）与个体数据相关，场景无法读取，写进 note 供读轨迹判断。
 */
Smoke.scenario("mudslap", function (stage) {
    const caster = stage.pokemon({ species: "Sandshrew", level: 30, moves: ["mudslap"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 20, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("mudslap", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("mudslap", caster) >= 1, "mudslap was committed");
        stage.expect(stage.damageTo(foe) > 0, "the target took mudslap damage");
        stage.note("命中下降是共享 accuracy 能力等级（必定生效，级数由特攻与厚泥决定）；场景不能读等级", {
            casts: stage.casts("mudslap", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10
        });
        stage.done();
    }, "mudslap cast and hit");
});
