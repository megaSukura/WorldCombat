// 圆瞳的可执行设计说明：一只宝可梦对一个贴身的原版生物睁一次圆眼睛，只说这一招。
// 必然事实：圆瞳被放出来过；目标带上共享的「被看软」身份（charmed）；目标的攻击属性随下降的攻击一起走低。
// 起手有多短、凝视还是疾视、视线与距离都不是本场景的必然事实，写进 note。
Smoke.scenario("babydolleyes", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "skitty", level: 30, moves: ["babydolleyes"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(600, function () {
        return stage.casts("babydolleyes") > 0
            && stage.hadMobEffect(target, "world_combat:status/charmed")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("babydolleyes") > 0, "baby-doll eyes was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/charmed"), "the target carried the shared charmed identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack drop");
        stage.note("圆瞳落地；起手极短、凝视与疾视的取舍、视线与距离都不是本场的必然事实。攻击下降级数由特攻之外的配置（凝视 2／疾视 1）决定，写进 note 供核对。", {
            casts: stage.casts("babydolleyes"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "baby-doll eyes lands on the target");
});
