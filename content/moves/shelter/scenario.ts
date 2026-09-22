/**
 * 闭关 的可执行设计说明。
 *
 * 场面：一只只会「闭关」的护城龙（Steel／Rock，40 级）与一只僵尸隔开 6 格、石质场地上开战。技能表里只有这一招。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/shelter 的壳窗口；
 *   默认「铁盾」形态套的是 shelter_sealed（会钉住移动）；移动速度因此低于合壳之前。
 * 壳的承伤额度、板数、抬了几级防御写进 note；承伤额度是「被打满即崩」的池子，是否被打满取决于随机交战，不硬断言。
 */
Smoke.scenario("shelter", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bastiodon", level: 40, moves: ["shelter"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("shelter", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/shelter")
            && (baseSpeed <= 0 || stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.0001);
    }, function () {
        stage.expect(stage.casts("shelter", caster) > 0, "shelter was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/shelter"), "the shell window carried the shared identity");
        stage.expect(stage.hadMobEffect(caster, "world_combat:shelter_sealed"), "the default sealed shell was applied");
        stage.expect(baseSpeed <= 0 || stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.0001,
            "the sealed shell rooted the caster in place");
        stage.after(60, function () {
            stage.note("shelter closed an iron shell; the damage pool absorbs hits until it cracks, which depends on the fight, so only the window and the seal are asserted", {
                casts: stage.casts("shelter", caster),
                speedBefore: baseSpeed,
                speedAfter: stage.attribute(caster, "minecraft:generic.movement_speed"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "shelter engages");
});
