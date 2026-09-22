// 折弯汤匙的可执行设计说明：一只超能力系宝可梦隔着一段距离对一个僵尸只说这一招，中间没有掩体。
// 必然事实：折弯汤匙被放出来过；通视的目标带上共享的「被引开注意」身份；它的攻击属性随之走低。
// 被掩体挡住而落空、命中瞬间的随机结果都不是必然事实，写进 note 供读轨迹判断。
Smoke.scenario("kinesis", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "kadabra", level: 45, moves: ["kinesis"], at: [-2, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("kinesis", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/beguiled")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("kinesis", caster) > 0, "kinesis was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/beguiled"), "the target carried the shared beguiled identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the beguiled target's attack fell");
        stage.note("kinesis is a single-target trick at range that needs line of sight; a wall between the two fizzles it", {
            casts: stage.casts("kinesis", caster), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "kinesis lands on the target");
});
