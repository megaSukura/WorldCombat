/**
 * 泰山压顶的可执行设计说明。
 *
 * 场面：一只只会泰山压顶的重型精灵，面对 3 格外的一只僵尸。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（座压命中）。
 * 是否把落点周围第二个目标一起罩住、是否让目标陷入麻痹，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("bodyslam", function (stage) {
    var caster = stage.pokemon({ species: "Snorlax", level: 36, moves: ["bodyslam"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var side = stage.mob({ type: "minecraft:zombie", at: [4, 0, 1] });
    stage.hostile(caster, foe);
    stage.hostile(caster, side);
    stage.until(900, function () {
        return stage.casts("bodyslam") > 0 && (stage.damageTo(foe) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.expect(stage.casts("bodyslam") > 0, "bodyslam was committed");
        stage.expect(stage.damageTo(foe) + stage.damageTo(side) > 0, "the body slam dealt damage");
        stage.note("bodyslam observations", { casts: stage.casts("bodyslam"), onFoe: stage.damageTo(foe), onSide: stage.damageTo(side),
            paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis"), paralyticSide: stage.hadMobEffect(side, "world_combat:status/paralysis"),
            moved: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.done();
    }, "bodyslam lands");
});
