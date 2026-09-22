// 盐腌的可执行设计说明：一只只会盐腌的宝可梦对一只高生命的普通系目标撒盐。
// 必然事实：本招被提交过；目标身上出现过共享身份 saltcure；盐壳在命中之后继续按间隔蛰掉伤害
//   （累计伤害明显超过命中那一下）。
// 命中、每口蛰痛量、盐壳持续多久，以及是否吃到钢/水翻倍，写进 note 供读轨迹判断。
Smoke.scenario("saltcure", function (stage) {
    var caster = stage.pokemon({ species: "garganacl", level: 45, moves: ["saltcure"], at: [-5, 0, 0] });
    var target = stage.pokemon({ species: "snorlax", level: 40, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("saltcure") > 0 && stage.hadMobEffect(target, "world_combat:status/saltcure");
    }, function () {
        var afterHit = stage.damageTo(target);
        stage.until(700, function () {
            return stage.damageTo(target) >= afterHit + 2 || !target.alive();
        }, function () {
            stage.expect(stage.casts("saltcure") > 0, "saltcure was committed");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/saltcure"), "the shared saltcure identity landed on the target");
            stage.expect(stage.damageTo(target) >= afterHit + 2, "the salt crust stung well beyond the initial hit");
            stage.note("saltcure brine", {
                casts: stage.casts("saltcure"),
                damageNow: Math.round(stage.damageTo(target) * 10) / 10,
                damageAtHit: Math.round(afterHit * 10) / 10,
                health: target.health(),
                moved: Math.round(stage.travelled(target) * 10) / 10
            });
            stage.done();
        }, "the salt crust stings");
    }, "salt cure applied");
});
