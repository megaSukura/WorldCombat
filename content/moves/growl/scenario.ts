// 叫声的可执行设计说明：一只宝可梦对身边一个原版生物叫一声，只说这一招。
// 必然事实：叫声被放出来过；目标带上共享的「被叫软」身份；目标的攻击属性随下降的攻击一起走低。
// 掩体能否挡住、拖长音还是短叫都不是本场景的必然事实（声音本就不看视线），写进 note。
Smoke.scenario("growl", function (stage) {
    var caster = stage.pokemon({ species: "eevee", level: 35, moves: ["growl"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(600, function () {
        return stage.casts("growl") > 0
            && stage.hadMobEffect(target, "world_combat:status/charmed")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("growl") > 0, "growl was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/charmed"), "the target carried the shared charmed identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack drop");
        stage.note("growl landed; sound needs no line of sight, so cover and the long howl are not part of this run", {
            casts: stage.casts("growl"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "growl lands on the target");
});
