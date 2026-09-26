/**
 * 二连劈 / dualchop —— 可执行设计说明。
 *
 * 一句话：一只会二连劈的伙伴抡起前肢，先沿准线竖劈一刀，再以第一刀落点为圆心横斩其两侧，至少一刀劈中。
 *
 * 场面：一只只会二连劈的烈咬陆鲨（garchomp，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 3 格——在射程内，AI 可以直接贴上去劈；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一刀的伤害（`stage.damageTo`）。
 *   两刀各自的命中与暴击、第二刀横斩覆盖到的目标、裂痕画出的地面线，都是结果，写进 note 供读轨迹判断。
 *   裂痕只画线、不改动方块，所以这里不再观察 changedBlocks。
 */
Smoke.scenario("dualchop", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "garchomp", level: 30, moves: ["dualchop"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dualchop", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("dualchop", caster) >= 1, "the caster committed dualchop");
            stage.expect(stage.damageTo(foe) > 0, "dualchop dealt damage to the foe");
            stage.note("the first blow is a trace line that stops at the first target or wall; the second is a wide short sweep centred on the first blow's landing point; the ground crack is visual only", {
                casts: stage.casts("dualchop", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                changedBlocks: stage.changedBlocks().length,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dualchop cracks a foe within 60 s");
});
