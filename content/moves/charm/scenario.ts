// 撒娇的可执行设计说明：一只近身的宝可梦对一个原版生物撒娇，只说这一招。
// 必然事实：撒娇被放出来过；目标带上共享的「被撒娇」身份；目标的攻击属性随下降的攻击一起走低。
// 命中瞬间的视线、距离以及贴近／飞吻的取舍都不是本场景的必然事实，写进 note。
Smoke.scenario("charm", function (stage) {
    var caster = stage.pokemon({ species: "skitty", level: 30, moves: ["charm"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(600, function () {
        return stage.casts("charm") > 0
            && stage.hadMobEffect(target, "world_combat:status/charmed")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("charm") > 0, "charm was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/charmed"), "the target carried the shared charmed identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack drop");
        stage.note("charm landed; the kiss posture, line of sight and distance are not part of this run", {
            casts: stage.casts("charm"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "charm lands on the target");
});
