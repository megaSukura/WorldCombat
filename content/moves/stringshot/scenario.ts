// 吐丝的可执行设计说明：一只只会这招的宝可梦对一个远处的僵尸吐出丝。
// 必然事实：吐丝被放出来过；僵尸带上共享的「被丝缠住」身份；它的移动速度属性随之下降。
// 命中判定（95）与是否被掩体挡下写进 note 供读轨迹判断。
Smoke.scenario("stringshot", function (stage) {
    var caster = stage.pokemon({ species: "spinarak", level: 35, moves: ["stringshot"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    var baseSpeed = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("stringshot") > 0
            && stage.hadMobEffect(target, "world_combat:status/silked")
            && stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("stringshot") > 0, "string shot was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/silked"), "the target carried the shared silked identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the target's movement speed fell with the Speed drop");
        stage.note("string shot bound the zombie; the net posture and the accuracy roll are not part of this run", {
            casts: stage.casts("stringshot"), baseSpeed: baseSpeed,
            speed: stage.attribute(target, "minecraft:generic.movement_speed"),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "string shot binds the target");
});
