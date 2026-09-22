/**
 * 火花 / ember 的可执行设计说明。
 *
 * 场面：只会火花的小火龙（Charmander）对六格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（火种命中）。
 * 引燃是 10% 起的概率（本单元 burnChance 公式）、暴击与散布见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("ember", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charmander", level: 30, moves: ["ember"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 38, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("ember", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("ember", caster) > 0, "ember was committed");
        stage.expect(stage.damageTo(foe) > 0, "the small flame struck the foe");
        stage.note("引燃约 10% 起（ember.burnChance）、暴击随机；星速与弧线见实现", {
            casts: stage.casts("ember", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "ember lands on a foe at range");
});
