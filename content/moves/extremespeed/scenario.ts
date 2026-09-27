/**
 * 神速 / extremespeed 的可执行设计说明。
 *
 * 一句话：一道长到看不见中间过程的直线射出去，撞上活体是这一族最重的一记，还会从它身上穿过去停在身后。
 *
 * 场面：一只只会神速的精灵（Lucario，40 级）面对五格外的蜘蛛；设为夜晚，晴天，两者开战，AI 只有这一招可用。
 *   蜘蛛比施法者矮、身体中心更低，用来验证贴地施术走水平路线，而不是让本条去程扫进施法者脚下地面。
 * 必然事实：本招被提交过；目标受到过伤害（高速撞实）。
 *   起点偏差导致的冲空、贯穿后落点、第二身体的挡停与暴击是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("extremespeed", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Lucario", level: 40, moves: ["extremespeed"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:spider", at: [2, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("extremespeed", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("extremespeed", caster) > 0, "extreme speed was committed");
        stage.expect(stage.damageTo(foe) > 0, "the ground charge reached the shorter target");
        stage.note("a grounded caster charges along the ground, so a target whose body centre sits lower than the caster's no longer buries the sweep in the caster's own feet. The default overrun form passes through the hit target and stops behind it; a second body stops the pass-through without taking a second damage instance.", {
            casts: stage.casts("extremespeed", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "extreme speed lands on the shorter spider");
});
