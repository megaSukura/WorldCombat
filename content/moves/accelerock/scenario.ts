/**
 * 冲岩 / accelerock 的可执行设计说明。
 *
 * 一句话：碎岩披身，整个身体贴地撞出去，撞实一下把人顶飞、落点崩出一小片碎石疤。
 *
 * 场面：一只只会冲岩的岩石系精灵（Rockruff，30 级）面对四格外的僵尸；站在石地上，石身材质取自脚下。
 *   两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（撞实）；落点地面被崩出碎石疤（石地 → 圆石，可被 changedBlocks 看到）。
 *   贯穿数、暴击与具体落点是数据与站位的结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("accelerock", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Rockruff", level: 30, moves: ["accelerock"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("accelerock", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("accelerock", caster) > 0, "accelerock was committed");
        stage.expect(stage.damageTo(foe) > 0, "the rock clad charge dealt damage");
        stage.expect(stage.changedBlocks().length > 0, "the impact scarred the ground");
        stage.note("the charge stops on the first target unless the breakthrough form is on, which plows through up to the pierce count; the impact leaves a leased rubble scar that fades on its own.", {
            casts: stage.casts("accelerock", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
            changedBlocks: stage.changedBlocks().length,
            tick: stage.tick()
        });
        stage.done();
    }, "accelerock charges into the zombie and scars the ground");
});
