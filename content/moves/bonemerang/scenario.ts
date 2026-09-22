/**
 * 骨头回力镖 / bonemerang 的可执行设计说明。
 *
 * 场面：只会骨头回力镖的卡拉卡拉（Cubone，35 级，原生的骨头持有者）隔着 6 格，对一只只会跃起、原地站桩的
 * 卡比兽（Snorlax，35 级）投掷；晴天平地。必然事实：本招被提交过（`stage.casts`）；骨头去或回至少命中一次
 * 并造成伤害。去与回各一段、两段是否都落上、骨头是被接回还是被打碎，写进 note 供读轨迹判断。
 */
Smoke.scenario("bonemerang", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cubone", level: 35, moves: ["bonemerang"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 35, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    var last = 0, lastHitAt = 0;
    stage.until(1400, function () {
        var now = stage.damageTo(foe);
        if (now > last) { last = now; lastHitAt = stage.tick(); }
        return stage.casts("bonemerang", caster) > 0 && lastHitAt > 0 && stage.tick() >= lastHitAt + 35;
    }, function () {
        stage.expect(stage.casts("bonemerang", caster) > 0, "bonemerang was committed");
        stage.expect(stage.damageTo(foe) > 0, "the bone connected on the way out or back");
        stage.note("去程与回程各结算一段 out / back；两段是否都命中取决于骨头掠过时目标是否还在原地（目标走开会空掉回程）。骨头耐久与弧线配置的实际差异，由完整装配的人工试玩核对。", {
            casts: stage.casts("bonemerang", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterAlive: caster.alive()
        });
        stage.done();
    }, "bonemerang lands on a standing foe");
});
