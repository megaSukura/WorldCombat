// 黑色目光的可执行设计说明：一只只会黑色目光的宝可梦隔着一小段空地凝视一只不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/trapped；凝视期间目标的移动速度属性掉到接近零。
// 目光绷断（掩体挡视线／被拽开／术者被打断）与松开的分支不是本场景的必然事实，写进 note。
Smoke.scenario("meanlook", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gastly", level: 35, moves: ["meanlook"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("meanlook", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/trapped")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed * 0.5;
    }, function () {
        stage.expect(stage.casts("meanlook", caster) >= 1, "caster committed mean look");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed * 0.5, "the gaze held the target in place");
        stage.note("the gaze is anchored to the caster's action: it breaks when cover blocks the line, the target is dragged past the leash, or the caster is interrupted, and releases when the duration ends. Those branches are not asserted here.", {
            casts: stage.casts("meanlook", caster),
            baseSpeed: baseSpeed,
            speed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "mean look pins the target");
});
