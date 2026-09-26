/**
 * 追打的可执行设计说明：一只物攻手用这一招扑一只低等级对手，验证它被放出并造成伤害。
 * 「方向自由、可空扑、背身翻倍、翻倍时才有向后抓住的双痕」依赖提交方向与目标在命中一刻的移动，场景只能写进 note。
 */
Smoke.scenario("pursuit", function (stage) {
    const caster = stage.pokemon({ species: "umbreon", level: 45, moves: ["pursuit"], at: [-2, 0, 0], properties: "nature=adamant" });
    const target = stage.pokemon({ species: "rattata", level: 25, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(600, function () { return stage.casts("pursuit", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("pursuit", caster) >= 1, "pursuit was committed");
        stage.expect(stage.damageTo(target) > 0, "the target took damage");
        stage.note("威力在命中时按目标速度矢量是否背向施法者翻倍，翻倍且真正命中才出现双痕；本场是否触发见轨迹", {
            dealt: stage.damageBy(caster), taken: stage.damageTo(target)
        });
        stage.done();
    }, "pursuit cast and damaged the target");
});
