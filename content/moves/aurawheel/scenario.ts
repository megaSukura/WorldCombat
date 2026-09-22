/**
 * 气场轮的可执行设计说明：一只莫鲁贝可用这一招滚向低等级对手，验证它被放出、造成伤害并带着位移。
 * 属性随样子（满腹=电/空腹=恶）与提速都写在施法者的形态与原生能力等级上，场景只能记录位移与伤害。
 */
Smoke.scenario("aurawheel", function (stage) {
    const caster = stage.pokemon({ species: "morpeko", level: 50, moves: ["aurawheel"], at: [-3, 0, 0], properties: "nature=adamant" });
    // 格斗系目标不免疫电属性，保证默认形态的电属性轮子吃得到伤害。
    const target = stage.pokemon({ species: "machop", level: 20, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(700, function () { return stage.casts("aurawheel", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("aurawheel", caster) >= 1, "aurawheel was committed");
        stage.expect(stage.damageTo(target) > 0, "the target took damage");
        stage.expect(stage.travelled(caster) > 0.5, "the caster moved while rolling");
        stage.note("本场为莫鲁贝可满腹形态，属性为电；空腹形态应变暗。提速写在原生能力等级上，场景无法直接断言", {
            dealt: stage.damageBy(caster), travelled: stage.travelled(caster)
        });
        stage.done();
    }, "aurawheel cast, damaged the target and moved");
});
