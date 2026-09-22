/**
 * 缠绕的可执行设计说明。
 *
 * 场面：一只只会缠绕的草系精灵（Bellsprout），面对 2.4 格外一只 Zigzagoon。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被缠上并受到伤害；目标身上出现过 trapped 身份。
 * 是否触发「再紧一道」、减速级数、束缚与定身多长，都是随机/数值结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("constrict", function (stage) {
    var caster = stage.pokemon({ species: "Bellsprout", level: 30, moves: ["constrict"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Zigzagoon", level: 16, moves: ["tackle"], at: [2.4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("constrict") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("constrict") > 0, "constrict was committed");
            stage.expect(stage.damageTo(foe) > 0, "the squeeze dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target was bound");
            stage.note("constrict observations", { casts: stage.casts("constrict"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                bound: stage.hadMobEffect(foe, "world_combat:status/trapped"),
                foeMoveSpeed: Math.round(stage.attribute(foe, "minecraft:generic.movement_speed") * 100) / 100,
                hurtBack: Math.round(stage.damageTo(caster) * 10) / 10 });
            stage.done();
        });
    }, "constrict binds");
});
