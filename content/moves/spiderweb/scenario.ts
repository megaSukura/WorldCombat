// 蛛网的可执行设计说明：一只只会蛛网的宝可梦隔一段空地吐丝，裹住一只不会动、不会还手的铁傀儡。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/trapped；目标移动速度属性随之下降。
// 分层（同一目标再中一次多缠一层、三层钉死）与「火把丝一次烧光」不是本场景的必然事实，写进 note。
Smoke.scenario("spiderweb", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "spinarak", level: 30, moves: ["spiderweb"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("spiderweb", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/trapped")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("spiderweb", caster) >= 1, "caster committed spider web");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the silk slowed the target's movement");
        stage.note("layers are recorded as the carrier's amplifier: a second hit on the same target adds a layer, three or more pin it fully, and any fire damage or being on fire burns the whole web away. Those branches are not asserted here.", {
            casts: stage.casts("spiderweb", caster),
            baseSpeed: baseSpeed,
            speed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            casterHp: caster.health(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "spider web wraps the target");
});
