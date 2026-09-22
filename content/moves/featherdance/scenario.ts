// 羽毛舞的可执行设计说明：一只只会这招的宝可梦对一个僵尸撒出羽绒云。
// 必然事实：羽毛舞被放出来过；羽绒命中或绒雾覆盖到僵尸，僵尸带上共享的「羽绒覆身」身份，
// 其攻击属性随大幅下降的攻击一起走低。
// 命中是投射物对移动目标的一次判定，具体落点与是否先命中再被绒雾补上写进 note。
Smoke.scenario("featherdance", function (stage) {
    var caster = stage.pokemon({ species: "farfetchd", level: 32, moves: ["featherdance"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("featherdance") > 0
            && stage.hadMobEffect(target, "world_combat:status/downy")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("featherdance") > 0, "feather dance was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/downy"), "the target carried the shared downy identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell along with the Attack drop");
        stage.note("feather dance travels as a projectile then leaves a down patch; whether this run hit directly or caught the zombie in the patch is not asserted.", {
            casts: stage.casts("featherdance"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "feather dance lands on the zombie");
});
