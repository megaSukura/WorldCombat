/**
 * 闪电强袭 / supercellslam 的可执行设计说明。
 *
 * 场面：会闪电强袭的电击兽（Electabuzz）对一只只会跃起、不会还手的鲤鱼王，双方开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`）；施法者沿弧线移动过（`travelled > 0.3`，
 *   只统计水平位移）。靶子站的落点在俯冲开始时被锁死且它不躲，命中是稳定结果。
 * 落空自伤（crash）取决于对手是否让开，写进 note 供读轨迹判断；电属性相性/本系由共享结算完成。
 */
Smoke.scenario("supercellslam", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Electabuzz", level: 42, moves: ["supercellslam"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Magikarp", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("supercellslam", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("supercellslam", caster) > 0, "supercell slam was committed");
        stage.expect(stage.damageTo(foe) > 0, "the charged drop landed on the target");
        stage.expect(stage.travelled(caster) > 0.3, "the user moved along the leap arc");
        stage.note("a stationary target keeps the locked landing point, so the hit is stable; self-hurt only appears when the landing point is empty (crash path)", {
            casts: stage.casts("supercellslam", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "supercell slam lands on a foe");
});
