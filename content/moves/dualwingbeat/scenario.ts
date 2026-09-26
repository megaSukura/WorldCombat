/**
 * 双翼 / dualwingbeat —— 可执行设计说明。
 *
 * 一句话：一只会双翼的伙伴俯冲下来，用两只翅膀先后各拍一下，至少一拍落在对手身上。
 *
 * 场面：一只只会双翼的钢铠鸦（corviknight，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 4 格——在悬停式射程内，AI 可以直接扑翼；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一拍的伤害（`stage.damageTo`）。
 *   两拍方向相反、各自判定：第一拍朝身前下方，第二拍以真实新身位向身后上方反拍，第二拍不再依赖第一拍命中来加成；
 *   两拍各自的命中与暴击、俯冲还是悬停，都是结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dualwingbeat", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "corviknight", level: 30, moves: ["dualwingbeat"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dualwingbeat", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("dualwingbeat", caster) >= 1, "the caster committed dualwingbeat");
            stage.expect(stage.damageTo(foe) > 0, "dualwingbeat dealt damage to the foe");
            stage.note("the two wingbeats sweep opposite directions and roll separately; the second gains no bonus from the first; crit and dive/hover are variable", {
                casts: stage.casts("dualwingbeat", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive(),
                travelled: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "dualwingbeat strikes a foe within 60 s");
});
