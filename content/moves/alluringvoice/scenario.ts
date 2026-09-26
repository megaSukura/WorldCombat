/**
 * 普通MC追击场景：没有能力等级的僵尸追赶歌者。首拍短音必须先造成一次伤害，隔一小段拖出的尾音再把仍在锥里、
 * 正在追击的僵尸惑乱——混乱只可能在第二拍落下，是这条两拍设计的关键。
 */
Smoke.scenario("alluringvoice", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.fill([-12, 0, -12], [12, 6, 12], "minecraft:air");
    stage.time("night");
    const singer = stage.pokemon({ species: "jigglypuff", level: 40, moves: ["alluringvoice"], at: [-3, 0, 0] });
    const pursuer = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(singer, pursuer);
    stage.until(700, function () { return stage.hadMobEffect(pursuer, "world_combat:status/confusion"); }, function () {
        stage.expect(stage.casts("alluringvoice", singer) > 0, "the singer committed alluring voice");
        stage.expect(stage.damageTo(pursuer) > 0, "the song damaged the ordinary pursuer");
        stage.expect(stage.hadMobEffect(pursuer, "world_combat:status/confusion"), "pursuit triggered confusion without stat stages or potions");
        stage.note("A chasing ordinary mob qualifies for confusion. Native attack fumbles remain probabilistic; this scenario asserts the guaranteed application, while the shared policy regression checks the attack gate.", {
            casts: stage.casts("alluringvoice", singer), damage: stage.damageTo(pursuer), stages: stage.stages(pursuer)
        });
        stage.done();
    }, "ordinary pursuer is confused");
});
