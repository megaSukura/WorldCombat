// 挠痒的可执行设计说明：一只速度快的宝可梦对一个站在原地挨挠的原版生物出手，只说这一招。
// 必然事实：挠痒被放出来过；目标带上共享的「痒意」身份；目标的攻击与护甲随下降的攻击、防御一起走低。
// 命中瞬间是否贴身、笑多久、轻挠还是猛挠都不是本场景的必然事实，写进 note。
Smoke.scenario("tickle", function (stage) {
    var caster = stage.pokemon({ species: "pikachu", level: 40, moves: ["tickle"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    var baseArmor = stage.attribute(target, "minecraft:generic.armor");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("tickle") > 0
            && stage.hadMobEffect(target, "world_combat:status/ticklish")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("tickle") > 0, "tickle was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/ticklish"), "the target carried the shared ticklish identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack drop");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < baseArmor - 0.001, "the target's armor fell with the Defence drop");
        stage.note("tickle landed; contact distance, laugh duration and the firm posture are not part of this run", {
            casts: stage.casts("tickle"), baseAttack: baseAttack, attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            baseArmor: baseArmor, armor: stage.attribute(target, "minecraft:generic.armor"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "tickle lands on the target");
});
