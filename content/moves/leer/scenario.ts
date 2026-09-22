// 瞪眼的可执行设计说明：一只宝可梦朝身前一个原版生物瞪一眼，只说这一招。
// 必然事实：瞪眼被放出来过；目标带上共享的「破防」身份；目标的护甲属性随下降的防御一起走低。
// 扇面角度、掩体能否挡下视线、瞪住还是横扫都不是本场景的必然事实，写进 note。
Smoke.scenario("leer", function (stage) {
    var caster = stage.pokemon({ species: "meowth", level: 30, moves: ["leer"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseArmor = stage.attribute(target, "minecraft:generic.armor");
    stage.hostile(caster, target);
    stage.until(600, function () {
        return stage.casts("leer") > 0
            && stage.hadMobEffect(target, "world_combat:status/guardbroken")
            && stage.attribute(target, "minecraft:generic.armor") < baseArmor - 0.001;
    }, function () {
        stage.expect(stage.casts("leer") > 0, "leer was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/guardbroken"), "the target carried the shared guardbroken identity");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < baseArmor - 0.001, "the target's armor fell with the Defense drop");
        stage.note("leer landed; the sweep angle, line of sight and the focus posture are not part of this run", {
            casts: stage.casts("leer"), baseArmor: baseArmor,
            armor: stage.attribute(target, "minecraft:generic.armor"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "leer lands on the target");
});
