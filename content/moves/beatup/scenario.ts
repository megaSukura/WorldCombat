/**
 * 围攻 / beatup 的可执行设计说明。
 *
 * 场面：只会围攻的黑鲁加（Houndoom，35 级，原生真实学习者）带着一名同队同伴（另一只黑鲁加，不带任何招式，
 *   只是站在身边的「在场同伴」），对五格外只会跃起、不会还手的卡比兽（Snorlax，45 级）开战；晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害；同伴就在身边且射线无阻，因此首次命中之后同一轮内
 *   还会再落一段（隔 45 刻读取，此时冷却 60 刻未到，不会有第二轮施放，读数只会来自同一轮的后续段落）。
 *   实际召集到几名、打了几段写进 note。
 * 本招读的是当前站在场上的同伴；每位同伴从自己的真实位置发一道直线暗影，隔墙或目标移开都会让它落空。
 */
Smoke.scenario("beatup", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "houndoom", level: 35, moves: ["beatup"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "houndoom", level: 35, moves: [], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [3, 0, 0] });
    stage.team("pack", [caster, ally]);
    stage.hostile(caster, foe);
    var opening = 0;
    stage.until(1200, function () {
        return stage.casts("beatup", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        opening = stage.damageTo(foe);
        stage.after(45, function () {
            stage.expect(stage.casts("beatup", caster) > 0, "beat up was committed");
            stage.expect(stage.damageTo(foe) > 0, "at least the leader's shadow connected");
            stage.expect(stage.damageTo(foe) > opening + 0.5, "an ally standing beside the leader also landed a blow");
            stage.note("每下基准威力随领队物攻与等级、召集半径与上限随等级、每下间隔随速度；同伴那一下按它自己的物攻相对领队缩放。每位同伴从自己的真实位置发一道直线暗影，撞上第一个非友方活体才结算，隔墙或目标移开就落空。实际召集到几名、打了几段由场上站位、射线与同伴数决定。", {
                casts: stage.casts("beatup", caster),
                openingHit: Math.round(opening * 10) / 10,
                total: Math.round(stage.damageTo(foe) * 10) / 10,
                allyAlive: ally.alive(),
                casterAlive: caster.alive(),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the pack piles onto the foe");
});
