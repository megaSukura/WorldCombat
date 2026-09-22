/**
 * 飞踢 / jumpkick 的可执行设计说明。
 *
 * 场面：会飞踢的飞腿郎（Hitmonlee）站在一只只会跃起、不会还手的鲤鱼王前，双方开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`）；施法者沿弧线移动过（`travelled > 0.3`）。
 * 靶子站的落点在俯冲开始时被锁死；靶子不躲，所以命中是稳定结果。落空自伤（crash）取决于对手是否让开，
 * 写进 note 供读轨迹判断——砸/踢偏时才在施法者身上出现自伤。
 */
Smoke.scenario("jumpkick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Hitmonlee", level: 40, moves: ["jumpkick"], at: [-3, 0, 0] });
    // 靶子只带跃起、不还手：命中与否只由本招的落点判定决定。
    var foe = stage.pokemon({ species: "Magikarp", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("jumpkick", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("jumpkick", caster) > 0, "jump kick was committed");
        stage.expect(stage.damageTo(foe) > 0, "the flying kick landed on the target");
        stage.expect(stage.travelled(caster) > 0.3, "the user moved along the leap arc");
        stage.note("a stationary target keeps the locked landing point, so the hit is stable; self-hurt only appears when the landing point is empty (crash path)", {
            casts: stage.casts("jumpkick", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "jump kick lands on a foe");
});
