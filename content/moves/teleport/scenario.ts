/**
 * 瞬间移动 / teleport 的可执行设计说明。
 *
 * 场面：只会瞬间移动的沙奈朵（Gardevoir，35 级，原生真实学习者）与四格外只会跃起的皮卡丘（45 级）对开，
 *   晴天平地。必然事实：本招被提交过（`stage.casts`）；施法者真的挪动了一段距离（`stage.travelled`）。
 * 甩掉多少敌人的目标、暴击与位移的精确落点由实现与随机决定，写进 note 供读轨迹判断。
 * 真正的「和后备宝可梦替换」需要共享入口，本场景只验证可观察到的瞬移部分（见报告共享前置）。
 */
Smoke.scenario("teleport", function (stage) {
    stage.fill([-16, -1, -16], [16, -1, 16], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 35, moves: ["teleport"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "pikachu", level: 45, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("teleport", caster) > 0 && stage.travelled(caster) > 1.5;
    }, function () {
        stage.expect(stage.casts("teleport", caster) > 0, "teleport was committed");
        stage.expect(stage.travelled(caster) > 1.5, "the user blinked a real distance");
        stage.note("瞬移距离随特攻与速度、甩仇恨半径随等级；野生个体额外 +3 格并松开自己的目标。真正的后备宝可梦替换需要共享的入场／收回入口，此处只交回可观察的瞬移。", {
            casts: stage.casts("teleport", caster),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "teleport blinks the user a real distance");
});
