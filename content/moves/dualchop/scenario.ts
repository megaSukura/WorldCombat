/**
 * 二连劈 / dualchop —— 可执行设计说明。
 *
 * 一句话：一只会二连劈的伙伴抡起前肢，朝身前同一个目标连劈两下，至少一下劈中。
 *
 * 场面：一只只会二连劈的烈咬陆鲨（garchomp，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 3 格——在射程内，AI 可以直接贴上去劈；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一劈的伤害（`stage.damageTo`）。
 *   两劈各自的命中与暴击、第一劈命中后第二劈的裂痕加成、地面裂痕铺出的格数与何时收回，写进 note 供读轨迹判断。
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
        var cracked = stage.changedBlocks().length;
        stage.after(10, function () { cracked = Math.max(cracked, stage.changedBlocks().length); });
        stage.after(80, function () {
            stage.expect(stage.casts("dualchop", caster) >= 1, "the caster committed dualchop");
            stage.expect(stage.damageTo(foe) > 0, "dualchop dealt damage to the foe");
            stage.note("each chop rolls separately; the second gains a breach bonus only if the first landed; the ground crack is a leased block that restores itself", {
                casts: stage.casts("dualchop", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                crackedCells: cracked,
                changedBlocksNow: stage.changedBlocks().length,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dualchop cracks a foe within 60 s");
});
