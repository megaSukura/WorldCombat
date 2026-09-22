/**
 * 跃起 / splash 的可执行设计说明。
 *
 * 场面：一只只会「跃起」的鲤鱼王与一只僵尸隔开约 10 格开战。技能表里只有这一招，而且它没有任何攻击手段，
 *   所以 AI 会用这一跳换位——朝威胁方向靠到保持距离的点上。
 * 必然事实：本招被提交过；这一跳确实把它自己挪动了一段（提交后等一小段再读位移）。
 * 跳了几次、跳了多远、有没有被僵尸追到，写进 note 供读轨迹判断。
 */
Smoke.scenario("splash", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "magikarp", level: 25, moves: ["splash"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("splash", caster) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("splash", caster) > 0, "splash was committed");
            stage.expect(stage.travelled(caster) > 0.5, "the flop moved the caster");
            stage.note("the flop is movement only; nothing else changes on any actor", {
                casts: stage.casts("splash", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                casterHp: Math.round(caster.health() * 10) / 10,
                foeHp: Math.round(foe.health() * 10) / 10
            });
            stage.done();
        });
    }, "splash is cast at least once");
});
