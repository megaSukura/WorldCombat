/**
 * 暴风 / hurricane 的可执行设计说明。
 *
 * 场面：会暴风的大比鸟（Pidgeot）在雨天对一只走过来的僵尸放出一道横掠的风墙。
 * 雨天让风旋更稳、更宽、更快（对应原生必中），用来稳定验证“风墙卷到目标并造成伤害”。
 * 必然事实：本招被提交过；目标受到过伤害。
 * 是否把僵尸卷晕属于概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("hurricane", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("rain");
    var caster = stage.pokemon({ species: "Pidgeot", level: 40, moves: ["hurricane"], at: [-6, 0, 0] });
    // 用血厚、只带跃起、不会还手的宝可梦当靶子：原版僵尸白天会自燃会把断言变假阳性；
    // 厚血靶子还能活到被风抛出去，note 里的位移才有意义。
    var foe = stage.pokemon({ species: "Wailmer", level: 30, moves: ["splash"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("hurricane", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("hurricane", caster) > 0, "hurricane was committed");
        stage.expect(stage.damageTo(foe) > 0, "the travelling vortex swept the foe in the rain");
        stage.note("风墙逐刻前进、每个目标只结算一次；雨天更宽更快更易卷晕，晴天会左右飘移", {
            casts: stage.casts("hurricane", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            confused: stage.hadMobEffect(foe, "world_combat:status/confusion"),
            movedFoe: Math.round(stage.travelled(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "hurricane sweeps the target");
});
