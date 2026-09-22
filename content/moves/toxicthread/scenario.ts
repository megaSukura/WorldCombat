// 毒丝的可执行设计说明：一只只会这招的宝可梦对一只非亡灵生物吐丝。
// 必然事实：毒丝被放出来过；目标带上共享的「被毒丝缠住」身份与共享的「中毒」身份；
// 移动速度属性随下降的速度一起走低。
// 目标用村民而不是僵尸：MC 的不死生物免疫中毒，中毒不会真正落地；蜘蛛在此环境同样免疫。
// 命中是投射物对移动目标的一次判定，是否被拽近/钉住、毒伤具体数值写进 note。
Smoke.scenario("toxicthread", function (stage) {
    var caster = stage.pokemon({ species: "spinarak", level: 30, moves: ["toxicthread"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:villager", at: [3, 0, 0] });
    var baseSpeed = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.hostile(caster, target);
    stage.until(800, function () {
        return stage.casts("toxicthread") > 0
            && stage.hadMobEffect(target, "world_combat:status/laced")
            && stage.hadMobEffect(target, "world_combat:status/poison")
            && stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("toxicthread") > 0, "toxic thread was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/laced"), "the target carried the shared laced identity");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/poison"), "the target carried the shared poison identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the target's speed fell along with the Speed drop");
        stage.note("the thread is a projectile: whether this run hit a moving villager directly, and whether the default pin form held it, are not asserted. The reel form is a configured branch.", {
            casts: stage.casts("toxicthread"), baseSpeed: baseSpeed,
            speed: stage.attribute(target, "minecraft:generic.movement_speed"),
            travelled: Math.round(stage.travelled(target) * 10) / 10,
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "toxic thread lands on the villager");
});
