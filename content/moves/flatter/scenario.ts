/**
 * 吹捧的可执行设计说明。
 *
 * 场面：一只只会吹捧的扒手猫与一只敌人僵尸相隔 10 格开战。僵尸会走近并近战，必然打到扒手猫；
 * 吹捧的特攻礼物与陶醉都会落在僵尸身上。没有墙，保证视线相通。目标不被钉住，会继续移动接近。
 * 必然事实：本招被提交过；僵尸被挂上共享身份 world_combat:status/confusion；礼物让它的共享特攻等级升高；
 * 它仍在移动（travelled > 0），说明没有定身。原版近战的走神挥空与陶醉时长写进 note。
 */
Smoke.scenario("flatter", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 34, moves: ["flatter"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [10, 0, 0] });
    var before = stage.stages(foe);
    stage.hostile(caster, foe);
    stage.until(800, function () {
        return stage.casts("flatter") > 0
            && stage.hadMobEffect(foe, "world_combat:status/confusion")
            && (stage.stages(foe).spa || 0) > (before.spa || 0) + 0.001
            && stage.travelled(foe) > 0;
    }, function () {
        stage.expect(stage.casts("flatter") > 0, "flatter was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the target was dazed");
        stage.expect((stage.stages(foe).spa || 0) > (before.spa || 0) + 0.001, "the special-attack gift landed");
        stage.expect(stage.travelled(foe) > 0, "the target kept moving (no pin)");
        stage.note("flatter observations", {
            casts: stage.casts("flatter"),
            spaBefore: before.spa || 0,
            spaAfter: stage.stages(foe).spa || 0,
            moved: Math.round(stage.travelled(foe) * 10) / 10
        });
        stage.done();
    }, "flatter dazes without pinning");
});
