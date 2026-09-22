/**
 * 神圣之火 / sacredfire 的可执行设计说明。
 *
 * 场面：只有凤王（Ho-Oh）会这一招，让它对三格外只带跃起、不会还手的卡比兽（Snorlax）在石地上开战。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（俯冲撞上或落点余焰烫到）。
 * 引燃是 50% 起的高概率（本单元 burnChance 公式）、击退、暴击见实现，写进 note 供读轨迹判断。
 */
Smoke.scenario("sacredfire", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hooh", level: 60, moves: ["sacredfire"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 38, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("sacredfire", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("sacredfire", caster) > 0, "sacred fire was committed");
        stage.expect(stage.damageTo(foe) > 0, "the dive struck (or the ember field burned) the foe");
        stage.note("引燃约 50% 起（sacredfire.burnChance）、击退、暴击与俯冲实际距离随机", {
            casts: stage.casts("sacredfire", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
            movedBy: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "sacred fire lands within 70 s");
});
