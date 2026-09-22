// 泪眼汪汪的可执行设计说明：一只宝可梦对一个站在正前的原版生物示弱，只说这一招。
// 必然事实：泪眼汪汪被放出来过；目标带上共享的「丧失斗志」身份；目标的攻击属性随下降的攻击、特攻一起走低。
// 施法者当时的血量比例决定降几级（本场景不一定掉到 75% 以下）、对方看不看得见眼泪都不是必然事实，写进 note。
Smoke.scenario("tearfullook", function (stage) {
    var caster = stage.pokemon({ species: "eevee", level: 36, moves: ["tearfullook"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("tearfullook") > 0
            && stage.hadMobEffect(target, "world_combat:status/disheartened")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("tearfullook") > 0, "tearful look was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/disheartened"), "the target carried the shared disheartened identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack and Sp. Atk drops");
        stage.note("tearful look landed; the caster's missing health and the sob posture are not part of this run", {
            casts: stage.casts("tearfullook"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "tearful look lands on the target");
});
