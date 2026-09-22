/**
 * 木枝突刺 / branchpoke 的可执行设计说明。
 *
 * 场面：一只只会木枝突刺的敲音猴（Grookey）面对约 2.5 格外的一只僵尸（在枝长之内）；设为夜晚，
 * 僵尸不会被日光灼烧，伤害只可能来自这一戳。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（戳实）。
 * 目标当时处在枝长的哪个比例、末梢弹劲吃到多少、是否挂住减速、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("branchpoke", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Grookey", level: 20, moves: ["branchpoke"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("branchpoke", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("branchpoke", caster) > 0, "branchpoke was committed");
            stage.expect(stage.damageTo(foe) > 0, "the branch poke dealt damage");
            stage.note("最长最细的一记直戳；站在枝条末端打满时伤害更高", {
                casts: stage.casts("branchpoke", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "branchpoke stabs the foe from the far end of the twig");
});
