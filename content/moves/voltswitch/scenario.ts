/**
 * 伏特替换 / voltswitch 的可执行设计说明。
 *
 * 场面：只会伏特替换的小磁怪（Magnemite，30 级，原生真实学习者）对六格外只会跃起、不会还手的卡比兽
 *   （Snorlax，40 级），晴天平地。必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（电弧命中）；
 *   施法者移动过（放电后瞬移到落点）。
 * 默认「余电式」会在原地留下一片电荷区；对手是否踏进去被电到由走位决定，写进 note。
 * 真正的「和后备宝可梦替换」需要共享入口，本场景只验证可观察到的部分（见报告共享前置）。
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
        stage.note("电弧威力与射程随特攻、余电区随特攻与等级、切换距离随速度；默认余电式在原位置留下一片电荷区。对手是否踏进电荷区被电到由走位决定。真正的后备宝可梦替换需要共享的入场／收回入口。", {
            casts: stage.casts("voltswitch", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "volt switch hits and blinks away");
});
