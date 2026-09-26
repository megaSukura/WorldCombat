// 撒娇的可执行设计说明：一只近身的宝可梦对一个站定的原版生物在近距离撒娇，只说这一招。
// 必然事实：撒娇被放出来过；目标带上共享的「被撒娇」身份；目标的攻击属性随下降的攻击一起走低。
// 命中瞬间的视线、距离以及贴近／飞吻的取舍都不是本场景的必然事实，写进 note。
// 夜间并冻结目标，避免日照灼烧与追击把目标推到近距射程之外，让「近距撒娇成立」这件事成为必然。
Smoke.scenario("charm", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "skitty", level: 30, moves: ["charm"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.noai(target);
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
        stage.note("charm landed in close range; the kiss projectile, its interception and the gaze line are not part of this run", {
            casts: stage.casts("charm"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "charm lands on the target");
});
