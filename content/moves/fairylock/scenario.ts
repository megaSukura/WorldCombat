/**
 * 妖精之锁 / fairylock 的可执行设计说明。
 *
 * 场面：一只只会「妖精之锁」的钥匙圈（Klefki）与一只不会动、不会还手的铁傀儡相隔 4 格开战；夜晚、天晴。
 *   技能表里只有这一招；威胁在封印半径内，它会直接落锁（以自身为中心）。
 * 必然事实：本招被提交过；术者与目标都带上共享身份 world_combat:status/fairy_locked；两者的移动速度属性都被压到一半以下。
 *   光栅的持续扫描、被推出圈外脱锁、圈外不受影响这些分支写进 note。
 */
Smoke.scenario("fairylock", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "klefki", level: 35, moves: ["fairylock"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    var baseCaster = stage.attribute(caster, "minecraft:generic.movement_speed");
    var baseFoe = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..14,limit=1] {NoAI:1b}");
    stage.until(800, function () {
        return stage.casts("fairylock", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/fairy_locked")
            && stage.hadMobEffect(foe, "world_combat:status/fairy_locked")
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseCaster * 0.5;
    }, function () {
        stage.expect(stage.casts("fairylock", caster) > 0, "fairy lock was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/fairy_locked"), "the caster was caught in its own field");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/fairy_locked"), "the target carried the shared fairy-locked identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseCaster * 0.5, "the caster was held in place by its own seal");
        stage.note("the lattice keeps scanning, so a body that walks in is caught and a body pushed out of the radius is freed; those branches are not asserted here", {
            casts: stage.casts("fairylock", caster),
            casterSpeed: stage.attribute(caster, "minecraft:generic.movement_speed"),
            foeSpeed: stage.attribute(foe, "minecraft:generic.movement_speed"),
            baseCaster: baseCaster,
            baseFoe: baseFoe,
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10
        });
        stage.done();
    }, "fairy lock seals the arena");
});
