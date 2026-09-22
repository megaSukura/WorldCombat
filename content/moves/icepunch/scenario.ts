/**
 * 冰冻拳 / icepunch 的可执行设计说明。
 *
 * 场面：只会冰冻拳的冰拳手（Weavile）贴着只会跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害。
 * 是否结霜（第一拳必结）、是否触发冻结（需目标已结霜或浸水），写进 note 供读轨迹判断。
 */
Smoke.scenario("icepunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Weavile", level: 40, moves: ["icepunch"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 36, moves: ["splash"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("icepunch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("icepunch", caster) > 0, "icepunch was committed");
            stage.expect(stage.damageTo(foe) > 0, "the frost punch dealt damage");
            stage.note("首拳留寒霜（减速）；目标已带寒霜或浸水时下一拳改为冻结", {
                casts: stage.casts("icepunch", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                chilled: stage.hadMobEffect(foe, "world_combat:status/chill"),
                frozen: stage.hadMobEffect(foe, "world_combat:status/frozen")
            });
            stage.done();
        });
    }, "icepunch lands and leaves a chill on a foe at point-blank range");
});
