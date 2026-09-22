/**
 * 急速折返 / uturn 的可执行设计说明。
 *
 * 场面：只会急速折返的奇诺栗鼠（Cinccino，32 级，原生真实学习者）对近旁（约 2.5 格）只会跃起、不会还手的卡比兽
 *   （Snorlax，40 级），晴天平地。必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（折返撞实）；
 *   施法者移动过（切进去又折回来）。
 * 交棒与折返距离的比例、暴击与命中分布由实现与随机决定，写进 note 供读轨迹判断。
 * 真正的「和后备宝可梦替换」需要共享入口，本场景只验证可观察到的部分（见报告共享前置）。
 */
Smoke.scenario("uturn", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cinccino", level: 32, moves: ["uturn"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [0.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("uturn", caster) > 0 && stage.damageTo(foe) > 0 && stage.travelled(caster) > 0.5;
    }, function () {
        stage.expect(stage.casts("uturn", caster) > 0, "u-turn was committed");
        stage.expect(stage.damageTo(foe) > 0, "the flyby strike connected");
        stage.expect(stage.travelled(caster) > 0.5, "the user moved in and back");
        stage.note("折返撞威力随物攻与速度、折返距离随速度与等级；交棒式默认关闭（远遁式沿弧拉回）。真正的后备宝可梦替换需要共享的入场／收回入口，此处只交回可观察的冲刺与折返。", {
            casts: stage.casts("uturn", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "u-turn flies in, strikes and folds back");
});
