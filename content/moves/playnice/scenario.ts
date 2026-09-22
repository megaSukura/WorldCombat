// 和睦相处的可执行设计说明：一只宝可梦对一个站在近处的原版生物摊手，只说这一招。
// 必然事实：和睦相处被放出来过；目标带上共享的「和睦」身份；目标的攻击属性随下降的攻击一起走低。
// 命中瞬间对方是否当场停手、摊手还是作揖都不是本场景的必然事实，写进 note。
Smoke.scenario("playnice", function (stage) {
    var caster = stage.pokemon({ species: "eevee", level: 34, moves: ["playnice"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("playnice") > 0
            && stage.hadMobEffect(target, "world_combat:status/befriended")
            && stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("playnice") > 0, "play nice was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/befriended"), "the target carried the shared befriended identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell with the Attack drop");
        stage.note("play nice landed; whether the zombie stopped attacking and the bow posture are not part of this run", {
            casts: stage.casts("playnice"), baseAttack: baseAttack,
            attack: stage.attribute(target, "minecraft:generic.attack_damage"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "play nice lands on the target");
});
