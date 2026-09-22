/**
 * 神速 / extremespeed 的可执行设计说明。
 *
 * 一句话：一道长到看不见中间过程的直线射出去，撞上活体是这一族最重的一记，还会从它身上穿过去停在身后。
 *
 * 场面：一只只会神速的精灵（Lucario，40 级）面对五格外的僵尸；设为夜晚，僵尸不会被日光灼烧，
 *   所以伤害只可能来自这一冲。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（高速撞实）。
 *   起点偏差导致的冲空、贯穿后落点、暴击是站位与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("extremespeed", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Lucario", level: 40, moves: ["extremespeed"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("extremespeed", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("extremespeed", caster) > 0, "extreme speed was committed");
        stage.expect(stage.damageTo(foe) > 0, "the heavy charge dealt damage");
        stage.note("the default overrun form carries the user through the target and stops behind it, so expect the caster to end up past the zombie. Misses come from the zombie stepping out of the long line.", {
            casts: stage.casts("extremespeed", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "extreme speed lands on the zombie");
});
