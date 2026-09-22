/**
 * 充电光束 / chargebeam 的可执行设计说明。
 *
 * 一句话：把电压成一道细束笔直射出去，命中后余流回灌、特攻提升，稍后命中点再吃一口余流。
 *
 * 场面：只会充电光束的电电虫（Joltik，充电光束真实学习者，35 级）对一只昏睡的小海狮（Slowpoke，30 级），
 *   相隔 6 格——已在射程内，不必先接近；昏睡让弹体有一个不躲的目标，用来看清「细束命中造成伤害」这条主线。
 *   石地、白天、晴。
 *
 * 必然事实：本招被提交过；目标受到过光束伤害。
 * 随机量写进 note：余流回灌掷（约 70%%）与是否触发第二口余流；暴击同样随机。
 */
Smoke.scenario("chargebeam", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "joltik", level: 35, moves: ["chargebeam"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("chargebeam", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("chargebeam", caster) >= 1, "the caster committed charge beam");
            stage.expect(stage.damageTo(foe) > 0, "the charged beam dealt damage to the foe");
            stage.note("the ~70% surge roll, the second residual bite and crits are random", {
                casts: stage.casts("chargebeam", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "charge beam lands on a foe within 60 s");
});
