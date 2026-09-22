/**
 * 毒千针的可执行设计说明。
 *
 * 场面：一只万针鱼在 9 格外朝卡比兽（没有招式、站着）一轮轮齐射。距离在射程内，AI 会直接出手。
 * 必然事实：本招被提交过；卡比兽受到过毒针齐射的伤害。整轮威力被针数均分，因此伤害会出现多次小额。
 * 命中率 100 但扇形边缘的针仍可能落空；中毒是 50% 概率，写成 note 供读轨迹判断。
 */
Smoke.scenario("barbbarrage", function (stage) {
    var shooter = stage.pokemon({ species: "Overqwil", level: 30, moves: ["barbbarrage"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 40, moves: [], at: [3, 0, 0] });
    stage.hostile(shooter, target);
    stage.until(800, function () {
        return stage.casts("barbbarrage") > 0 && stage.damageBy(shooter) > 0;
    }, function () {
        stage.expect(stage.casts("barbbarrage") > 0, "barbbarrage was committed");
        stage.expect(stage.damageBy(shooter) > 0, "barbbarrage dealt damage");
        stage.note("barbbarrage observations", {
            casts: stage.casts("barbbarrage"), onTarget: Math.round(stage.damageTo(target) * 10) / 10,
            poisoned: stage.hasMobEffect(target, "world_combat:status/poison"),
            moved: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "barb volley lands");
});
