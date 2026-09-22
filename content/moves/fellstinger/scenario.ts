/**
 * 致命针刺的可执行设计说明：一只高物攻手用这一招扎一只低等级对手，验证它被放出并造成伤害。
 * 击倒与随后的攻击提升依赖目标被这一击带走；把目标压到很低等级以提高概率，结果写进 note。
 */
Smoke.scenario("fellstinger", function (stage) {
    const caster = stage.pokemon({ species: "beedrill", level: 45, moves: ["fellstinger"], at: [-2, 0, 0], properties: "nature=adamant" });
    const target = stage.pokemon({ species: "caterpie", level: 5, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(700, function () { return stage.casts("fellstinger", caster) >= 1 && (stage.damageTo(target) > 0 || !target.alive()); }, function () {
        stage.expect(stage.casts("fellstinger", caster) >= 1, "fellstinger was committed");
        stage.expect(stage.damageTo(target) > 0 || !target.alive(), "the target took damage or was knocked out");
        stage.note("击倒后攻击按等级阶梯提升；提升写在施法者的原生能力等级上，场景只能记录目标是否被击倒", {
            defeated: !target.alive(), dealt: stage.damageBy(caster)
        });
        stage.done();
    }, "fellstinger cast and resolved");
});
