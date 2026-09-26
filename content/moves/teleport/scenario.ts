/**
 * 瞬间移动 / teleport 的可执行设计说明。
 *
 * 场面：只会瞬间移动的沙奈朵（Gardevoir，35 级，原生真实学习者）与四格外只会跃起的皮卡丘（45 级）对开，
 *   平地。必然事实：本招被提交过（`stage.casts`）；施法者真的挪动了一段距离（`stage.travelled`）。
 *   AI 的落点从自由三维候选里挑（原生 freeSpace 探针确认整个身体站得下、脚下有地），选取为 `kind: "point"`。
 * 甩掉多少敌人的目标、落点的精确高度由实现与随机决定，写进 note 供读轨迹判断。
 * 玩家手动选高台/墙内落点的路径由用户试玩验收；本场景验证可观察到的三维瞬移。
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
        stage.note("瞬移距离随特攻与速度、甩仇恨半径随等级；落点是自由三维点，整个身体站不下就直接失败，只有成功离位才清除追击关系。野生个体额外 +3 格并松开自己的目标。", {
            casts: stage.casts("teleport", caster),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "teleport blinks the user a real distance");
});
