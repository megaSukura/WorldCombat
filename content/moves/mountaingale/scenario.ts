/**
 * 冰山风 / mountaingale 的可执行设计说明。
 *
 * 场面：只会冰山风的冰岩怪（Avalugg，冰）对一只僵尸，中远距离、夜间（僵尸不会被日光灼烧），两者开战。
 * 僵尸会朝施法者直走，正落在弹道与碎裂圈里，所以被巨冰或碎冰扫到是这一招的正常结果。
 * 必然事实：本招被提交过；目标受到过伤害。
 * 是否畏缩、暴击、落地是否正好压在目标身上，写进 note 供读轨迹判断。
 */
Smoke.scenario("mountaingale", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "Avalugg", level: 40, moves: ["mountaingale"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1100, function () {
        return stage.casts("mountaingale", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("mountaingale", caster) > 0, "mountaingale was committed");
        stage.expect(stage.damageTo(foe) > 0, "the boulder or its shards dealt damage");
        stage.note("the flinch roll, crits, where the boulder landed and whether the ice mound was accepted are random/positional", {
            casts: stage.casts("mountaingale", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            changedBlocks: stage.changedBlocks().length,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "mountaingale lands on a foe within throwing range");
});
