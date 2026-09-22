/**
 * 热风 / heatwave 的可执行设计说明。
 *
 * 场面：只会热风的煤炭龟（Torkoal）对五格外的卡比兽（Snorlax，只会跃起、不会还手），晴天的石台。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（热风扫中）。
 * 灼伤（10% 起）、烈日加成与击退距离都是概率与位置相关的随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("heatwave", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "torkoal", level: 40, moves: ["heatwave"], at: [-2.5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("heatwave", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("heatwave", caster) > 0, "torkoal committed heat wave");
        stage.expect(stage.damageTo(foe) > 0, "the hot gust swept the foe");
        stage.note("10% burn, the sunlight bonus and the push are random/positional",
            { casts: stage.casts("heatwave", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
              burned: stage.hadMobEffect(foe, "world_combat:status/burn"), travelled: Math.round(stage.travelled(foe) * 10) / 10,
              foeAlive: foe.alive() });
        stage.done();
    }, "heat wave sweeps a foe in the cone");
});
