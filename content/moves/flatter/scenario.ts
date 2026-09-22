/**
 * 吹捧的可执行设计说明。
 *
 * 场面：一只只会吹捧的扒手猫与一只敌人僵尸相隔 8 格开战。僵尸会走近并近战，必然打到扒手猫；
 * 吹捧的特攻礼物与混乱都会落在僵尸身上，短定身让它脚步一顿。没有墙，保证视线相通。
 * 必然事实：本招被提交过；僵尸被挂上共享身份 world_combat:status/confusion；礼物让它的攻击属性升高；
 * 它随后打中扒手猫时被反噬（damageTo(僵尸) > 0，且扒手猫只有这一招、不结算任何伤害）。
 * 定身与原版近战的挥空这类随机/瞬时结果写进 note。
 */
Smoke.scenario("flatter", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 34, moves: ["flatter"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    var before = stage.attribute(foe, "minecraft:generic.attack_damage");
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("flatter") > 0
            && stage.hadMobEffect(foe, "world_combat:status/confusion")
            && stage.attribute(foe, "minecraft:generic.attack_damage") > before + 0.001
            && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flatter") > 0, "flatter was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the target was confused");
        stage.expect(stage.attribute(foe, "minecraft:generic.attack_damage") > before + 0.001, "the special-attack gift landed");
        stage.expect(stage.damageTo(foe) > 0, "the flattered target hurt itself");
        stage.note("flatter observations", {
            casts: stage.casts("flatter"),
            attackBefore: before,
            attackAfter: stage.attribute(foe, "minecraft:generic.attack_damage"),
            recoilOnFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(foe) * 10) / 10
        });
        stage.done();
    }, "flatter lands and the target recoils");
});
