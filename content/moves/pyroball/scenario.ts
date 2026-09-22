/**
 * 火焰球 / pyroball 的可执行设计说明。
 *
 * 场面：只会火焰球的闪焰王牌（Cinderace）对六格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（火球命中炸开）。
 * 引燃是原生 10% 概率（本单元 burnChance 公式）、落点焦土与出膛散布见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("pyroball", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Cinderace", level: 45, moves: ["pyroball"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 38, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("pyroball", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("pyroball", caster) > 0, "pyroball was committed");
        stage.expect(stage.damageTo(foe) > 0, "the fiery ball struck and burst");
        stage.note("引燃约 10% 概率（pyroball.burnChance），落点焦土时长与出膛散布见实现；散布替代原生 90 命中", {
            casts: stage.casts("pyroball", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "pyroball lands on a foe at range");
});
