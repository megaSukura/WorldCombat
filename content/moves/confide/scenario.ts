// 密语的可执行设计说明：一只高特攻的宝可梦对一只没有特攻概念的原版生物说一句秘密，只说这一招。
// 必然事实：密语被放出来过；目标带上共享的「失神」身份；目标的攻击属性随下降的特攻一起走低。
// 命中瞬间目标在不在出手、传谣扩散到几个人都不是本场景的必然事实，写进 note。
Smoke.scenario("confide", function (stage) {
    var caster = stage.pokemon({ species: "abra", level: 45, moves: ["confide"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("confide") > 0
            && stage.hadMobEffect(target, "world_combat:status/confided")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("confide") > 0, "confide was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confided"), "the target carried the shared confided identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell along with the Sp. Atk drop");
        stage.note("confide landed; whether cover was involved and the rumor spread are not part of this run", {
            casts: stage.casts("confide"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "confide lands on the target");
});
