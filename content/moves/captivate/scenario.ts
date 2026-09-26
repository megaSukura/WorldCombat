// 诱惑的可执行设计说明。回眸是 aim：只对一个看得见的合法敌实体生效；真正被削低特攻才挂身份。
// 必然事实：诱惑被放出来过；目标带上共享的「被迷住」身份；目标共享阶梯里的特攻被压低至少两级。
// 同性免疫、掩体挡下、空放与献舞姿态不是本场景的必然事实，写进 note。
Smoke.scenario("captivate", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["captivate"], at: [-1, 0, 0], properties: "gender=male" });
    var target = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("captivate") > 0
            && stage.hadMobEffect(target, "world_combat:status/captivated")
            && (stage.stages(target).spa || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("captivate") > 0, "captivate was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/captivated"), "the target carried the shared captivated identity");
        stage.expect((stage.stages(target).spa || 0) <= -2, "the target's shared Sp. Atk stage fell by the base amount");
        stage.note("captivate landed; same-gender immunity, cover and the dance posture are not part of this run", {
            casts: stage.casts("captivate"), stages: stage.stages(target),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "captivate lands on the target");
});

// 异性宝可梦：回眸对性别相反的宝可梦生效，原生特攻阶梯下降，且不造成伤害。
Smoke.scenario("captivate-gender", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["captivate"], at: [-1, 0, 0], properties: "gender=male" });
    var target = stage.pokemon({ species: "abra", level: 40, moves: [], at: [3, 0, 0], properties: "gender=female" });
    stage.noai(target);
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("captivate", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/captivated")
            && (stage.stages(target).spa || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("captivate", caster) > 0, "captivate was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/captivated"), "the opposite-gender target carried the shared captivated identity");
        stage.expect((stage.stages(target).spa || 0) <= -2, "the target's native Sp. Atk stage fell");
        stage.expect(stage.damageTo(target) <= 0.001, "captivate itself dealt no damage");
        stage.note("captivate crossed the gender rule; cover and the dance posture are not part of this run", {
            casts: stage.casts("captivate", caster), stages: stage.stages(target), damageTo: stage.damageTo(target)
        });
        stage.done();
    }, "captivate lands across genders");
});
