/**
 * 觉醒力量的可执行设计说明：一只高速特攻手用这一招打一只低等级的对手，验证它真的被放出并造成伤害。
 * 属性由个体值决定这件事无法在场景里断言（场景只能布置种族、等级与技能），因此写进 note 供读轨迹判断。
 */
Smoke.scenario("hiddenpower", function (stage) {
    const caster = stage.pokemon({ species: "espeon", level: 50, moves: ["hiddenpower"], at: [-5, 0, 0], properties: "nature=modest" });
    // 格斗系目标对 16 种觉醒属性都没有免疫，保证一定吃得到伤害。
    const target = stage.pokemon({ species: "machop", level: 25, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(600, function () { return stage.casts("hiddenpower", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("hiddenpower", caster) >= 1, "hiddenpower was committed");
        stage.expect(stage.damageTo(target) > 0, "the target took damage");
        stage.note("属性与颜色由施法者六项个体值算出；本场为 espeon 个体的固有觉醒属性，不能在这里预设", {
            dealt: stage.damageBy(caster), taken: stage.damageTo(target)
        });
        stage.done();
    }, "hiddenpower cast and damaged the target");
});
