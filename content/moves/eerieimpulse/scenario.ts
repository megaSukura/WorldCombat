// 怪异电波的可执行设计说明：一只只会怪异电波的 Mareep 对着近身的一个原版生物放电场。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/jammed；目标的攻击属性随下降的特攻一起走低。
// 圈里到底罩住几个、掉 2 级还是 3 级、过载是否开启都不是本场景的必然事实，写进 note。
Smoke.scenario("eerieimpulse", function (stage) {
    var caster = stage.pokemon({ species: "mareep", level: 35, moves: ["eerieimpulse"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var attack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("eerieimpulse", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/jammed")
            && stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001;
    }, function () {
        stage.expect(stage.casts("eerieimpulse", caster) > 0, "eerieimpulse was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/jammed"), "the target carried the shared jammed identity");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001,
            "the target's attack fell with the Sp. Atk drop");
        stage.note("eerieimpulse landed; how many foes stood in the ring and whether overload was on are not part of this run", {
            casts: stage.casts("eerieimpulse", caster), attack: [attack, stage.attribute(target, "minecraft:generic.attack_damage")],
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "eerieimpulse jams the target");
});
