/**
 * 快速折返 / flipturn 的可执行设计说明。
 *
 * 场面：只会快速折返的浮潜鼬（Floatzel，34 级，原生真实学习者）对近旁（约 2.5 格）只会跃起、不会还手的卡比兽
 *   （Snorlax，42 级），晴天平地。必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（冲撞撞实）；
 *   施法者移动过（撞上去又滑走）。
 * 是否越到另一侧、滑了多远、有没有暴击由位置与随机决定，写进 note 供读轨迹判断；湿身加长滑行需要水面，
 * 本场景为平地，只在完整装配的试玩里核对。
 * 真正的「和后备宝可梦替换」需要共享入口，本场景只验证可观察到的部分（见报告共享前置）。
 */
Smoke.scenario("flipturn", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "floatzel", level: 34, moves: ["flipturn"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 42, moves: ["splash"], at: [0.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("flipturn", caster) > 0 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.5;
    }, function () {
        stage.expect(stage.casts("flipturn", caster) > 0, "flip turn was committed");
        stage.expect(stage.damageTo(foe) > 0, "the ram connected");
        stage.expect(stage.travelled(caster) > 0.5, "the user crossed over and glided away");
        stage.note("冲撞威力随物攻与速度、越位与滑行随速度与体重；回身式默认关闭（深潜式越过目标继续远遁）。湿身加长滑行需在水面核对。真正的后备宝可梦替换需要共享的入场／收回入口。", {
            casts: stage.casts("flipturn", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "flip turn crosses over the foe");
});
