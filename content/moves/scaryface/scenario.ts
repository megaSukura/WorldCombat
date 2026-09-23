// 鬼面的一轮减速：生效后停止后续施放，检查图标消失与移动速度恢复。
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
        stage.setPp(caster, "scaryface", 0);
        stage.note("One short slow window landed; checking that its visible status and speed contribution end together. Recoil and use around cover remain playtest observations.", {
            casts: stage.casts("scaryface"), baseSpeed: baseSpeed,
            speed: stage.attribute(target, "minecraft:generic.movement_speed"),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.until(360, function () {
            return !stage.hasMobEffect(target, "world_combat:status/feared");
        }, function () {
            stage.after(2, function () {
                stage.expect(Math.abs(stage.attribute(target, "minecraft:generic.movement_speed") - baseSpeed) < 0.001,
                    "Speed returned when the frightened status ended");
                stage.expect((stage.stages(target).spe || 0) === 0, "scary face left no persistent Speed loss");
                stage.done();
            });
        }, "scary face expires with its slow");
    }, "scary face lands on the zombie");
});
