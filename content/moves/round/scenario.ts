/**
 * 轮唱 / round —— 可执行设计说明。
 *
 * 一句话：领唱者唱一句，余韵落给身边的同伴，歌句点名打到前方的目标。
 * 场面：两只同队的轮唱学习者（胖丁与皮皮）对一只僵尸；两只宝可梦都只会轮唱，AI 必然起唱。
 * 断言只取必然事实：本招被唱出过、目标受到过伤害、至少一方同伴身上出现过共享身份 round（余韵）。
 * 谁先唱、接了对方几句是时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("round", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var lead = stage.pokemon({ species: "jigglypuff", level: 40, moves: ["round"], at: [-1.5, 0, 0] });
    var answer = stage.pokemon({ species: "clefairy", level: 40, moves: ["round"], at: [1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.team("chorus", [lead, answer]);
    stage.hostile(lead, foe);
    stage.hostile(answer, foe);
    stage.until(1400, function () {
        return stage.casts("round", lead) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("round", lead) > 0, "lead sang round");
            stage.expect(stage.damageTo(foe) > 0, "the verse damaged the foe");
            stage.expect(stage.hadMobEffect(lead, "world_combat:status/round") || stage.hadMobEffect(answer, "world_combat:status/round"),
                "an ally carried the shared round identity");
            stage.note("余韵只会落在同伴身上，接唱翻倍由公式读身份决定；谁先起唱、接了几句是时序结果。", {
                leadCasts: stage.casts("round", lead),
                answerCasts: stage.casts("round", answer),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                leadRefrain: stage.hadMobEffect(lead, "world_combat:status/round"),
                answerRefrain: stage.hadMobEffect(answer, "world_combat:status/round"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the round is sung");
});
