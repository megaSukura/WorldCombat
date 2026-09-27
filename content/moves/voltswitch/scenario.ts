/**
 * 伏特替换 / voltswitch 的可执行设计说明。
 *
 * 场面：只会伏特替换的小磁怪（Magnemite，30 级，原生真实学习者）对六格外只会跃起、不会还手的卡比兽
 *   （Snorlax，40 级），晴天平地。必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（电弧命中）；
 *   施法者移动过（放电后瞬移到落点）。选取为 `kind: "aim"`，这里交给 AI 按仇恨推荐目标。
 * 默认「留守式」放电瞬移后留在场上；本场景的施法者没有后备队伍，验证的是「无后备仍能场内闪退」。
 */
Smoke.scenario("voltswitch", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 30, moves: ["voltswitch"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("voltswitch", caster) > 0 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.5;
    }, function () {
        stage.expect(stage.casts("voltswitch", caster) > 0, "volt switch was committed");
        stage.expect(stage.damageTo(foe) > 0, "the arc connected");
        stage.expect(stage.travelled(caster) > 0.5, "the user blinked to a new spot");
        stage.note("电弧威力与射程随特攻、切换距离随速度；默认留守式放电瞬移后留在场上，换手式有合法后备时与待命的一只换手。一次施放只瞬移一次，落点以脚底真实支撑和原生空域探针核对，找不到安全点就原地收招。", {
            casts: stage.casts("voltswitch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "volt switch hits and blinks away");
});
