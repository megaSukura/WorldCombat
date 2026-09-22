/**
 * 热水 / scald 的可执行设计说明。
 *
 * 场面：只会热水的杰尼龟（Squirtle）对七格外的卡比兽（Snorlax，只会跃起、不会还手），晴天平地的石台。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（沸水命中）。
 * 灼伤（30% 起）、湿身加成、水洼的翻滚伤害都是概率与位置相关的随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("scald", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 34, moves: ["scald"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("scald", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("scald", caster) > 0, "squirtle committed scald");
        stage.expect(stage.damageTo(foe) > 0, "the boiling water struck the foe");
        stage.note("30% burn and the puddle's burn roll are random; the puddle is left where the glob lands",
            { casts: stage.casts("scald", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
              burned: stage.hadMobEffect(foe, "world_combat:status/burn"), foeAlive: foe.alive() });
        stage.done();
    }, "scald lands on a foe at range");
});
