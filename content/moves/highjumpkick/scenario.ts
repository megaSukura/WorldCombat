/**
 * 飞膝踢 / highjumpkick 的可执行设计说明。
 *
 * 场面：会飞膝踢的师父鼬（Mienshao）对一只只会跃起、不会还手的鲤鱼王，双方开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`）；施法者沿竖直弧线移动过（`travelled > 0.2`，
 *   只统计水平位移，垂直拔高不计入，所以阈值低）。靶子站的落点在顶点被锁死且它不躲，命中是稳定结果。
 * 落空自伤（crash）取决于对手是否让开，写进 note 供读轨迹判断。
 */
Smoke.scenario("highjumpkick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Mienshao", level: 42, moves: ["highjumpkick"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Magikarp", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("highjumpkick", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("highjumpkick", caster) > 0, "high jump kick was committed");
        stage.expect(stage.damageTo(foe) > 0, "the falling knee landed on the target");
        stage.expect(stage.travelled(caster) > 0.2, "the user moved along the leap arc");
        stage.note("a stationary target keeps the locked landing point, so the hit is stable; self-hurt only appears when the landing point is empty (crash path)", {
            casts: stage.casts("highjumpkick", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "high jump kick lands on a foe");
});
