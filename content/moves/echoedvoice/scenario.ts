/**
 * 回声 / echoedvoice —— 可执行设计说明。
 *
 * 一句话：一只只会回声的宝可梦一唱再唱，声音一层层叠高，点名打前方的僵尸。
 * 场面：Jigglypuff（Lv40）只带回声，对一只平地上的僵尸；AI 会重复起唱。
 * 断言只取必然事实：本招被唱出过、僵尸吃到过伤害、自己身上出现过共享身份 echoed_voice（余响）。
 * 叠到几层、每声伤害多少属时序结果，写进 note 供读轨迹判断（轨迹里的 damage 逐步应随层数变大）。
 */
Smoke.scenario("echoedvoice", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "jigglypuff", level: 40, moves: ["echoedvoice"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1400, function () {
        return stage.casts("echoedvoice", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("echoedvoice", user) > 0, "jigglypuff sang echoed voice");
            stage.expect(stage.damageTo(foe) > 0, "the voice damaged the foe");
            stage.expect(stage.hadMobEffect(user, "world_combat:status/echoed_voice"), "the echo identity lingered on the singer");
            stage.note("层数由现场回声（含自己）叠起，威力 = 基础 × 层数；重复起唱应当越叠越高，读轨迹里的 damage 逐步是否变大。", {
                casts: stage.casts("echoedvoice", user),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                echo: stage.hadMobEffect(user, "world_combat:status/echoed_voice"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the echo builds");
});
