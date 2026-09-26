// 摇尾巴的可执行设计说明：一只宝可梦对身边一个站定的原版生物背身左右两扫，只说这一招。
// 必然事实：摇尾巴被放出来过；目标带上共享的「破防」身份；目标的护甲属性随下降的防御一起走低。
// 尾巴半径、掩体能否挡下视线、第二扫是否补到追兵都不是本场景的必然事实，写进 note。
// 夜间并冻结目标，避免日照灼烧干扰观察。
Smoke.scenario("tailwhip", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "pikachu", level: 30, moves: ["tailwhip"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.noai(target);
    var baseArmor = stage.attribute(target, "minecraft:generic.armor");
    stage.hostile(caster, target);
    stage.until(600, function () {
        return stage.casts("tailwhip") > 0
            && stage.hadMobEffect(target, "world_combat:status/guardbroken")
            && stage.attribute(target, "minecraft:generic.armor") < baseArmor - 0.001;
    }, function () {
        stage.expect(stage.casts("tailwhip") > 0, "tail whip was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/guardbroken"), "the target carried the shared guardbroken identity");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < baseArmor - 0.001, "the target's armor fell with the Defense drop");
        stage.note("tail whip landed; the rear 120-degree band, the second swing, line of sight and the once-only drop are not part of this run", {
            casts: stage.casts("tailwhip"), baseArmor: baseArmor,
            armor: stage.attribute(target, "minecraft:generic.armor"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "tail whip lands on the target");
});
