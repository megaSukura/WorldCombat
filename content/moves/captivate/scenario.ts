// 诱惑的可执行设计说明：一只高特攻的宝可梦对一个没有性别的原版生物抬眸，只说这一招。
// 必然事实：诱惑被放出来过；目标带上共享的「被迷住」身份；目标的攻击属性随大幅下降的特攻一起走低。
// 宝可梦之间的异性判定、命中瞬间对方在不在出手都不是本场景的必然事实，写进 note。
Smoke.scenario("captivate", function (stage) {
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["captivate"], at: [-1, 0, 0], properties: "gender=male" });
    var target = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("captivate") > 0
            && stage.hadMobEffect(target, "world_combat:status/captivated")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("captivate") > 0, "captivate was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/captivated"), "the target carried the shared captivated identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell along with the Sp. Atk drop");
        stage.note("captivate landed; opposite-gender Pokemon immunity and the dance posture are not part of this run", {
            casts: stage.casts("captivate"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "captivate lands on the target");
});
