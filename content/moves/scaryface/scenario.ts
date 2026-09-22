// 鬼面的可执行设计说明：一只只会这招的宝可梦在开阔场地正对一个僵尸，转移过脸瞪它。
// 必然事实：鬼面被放出来过；僵尸带上共享的「被吓住」身份；僵尸的移动速度属性随大幅下降的速度一起走低。
// 命中瞬间的逼退距离、僵住时长，以及视线被掩体挡住的分支都不是本场景的必然事实，写进 note。
Smoke.scenario("scaryface", function (stage) {
    var caster = stage.pokemon({ species: "mankey", level: 30, moves: ["scaryface"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var baseSpeed = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("scaryface") > 0
            && stage.hadMobEffect(target, "world_combat:status/feared")
            && stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("scaryface") > 0, "scary face was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/feared"), "the target carried the shared feared identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the target's speed fell along with the Speed drop");
        stage.note("scary face requires a clear line of sight; the open arena guarantees it. The fear recoil, the brief freeze and the cover-blocked branch are not asserted here.", {
            casts: stage.casts("scaryface"), baseSpeed: baseSpeed,
            speed: stage.attribute(target, "minecraft:generic.movement_speed"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "scary face lands on the zombie");
});
