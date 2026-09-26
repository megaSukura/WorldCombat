/**
 * 头锤 / headbutt 的可执行设计说明。
 *
 * 场面：只会头锤的小拉达（Rattata）对一只僵尸，贴身距离、夜间（僵尸不会被日光灼烧），两者开战。
 * 必然事实：本招被提交过；目标受到过伤害（正面顶实）。
 * 是否掷出畏缩、顶空还是顶中、暴击，都是概率与站位结果，写进 note 供读轨迹判断。
 * 本招是 `kind: "aim"`：手动可朝任意方向空顶，这里交给 AI 按仇恨推荐目标。
 */
Smoke.scenario("headbutt", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Rattata", level: 30, moves: ["headbutt"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("headbutt", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("headbutt", caster) > 0, "headbutt was committed");
        stage.expect(stage.damageTo(foe) > 0, "the headbutt dealt damage");
        stage.note("the flinch roll, whether the first lunge connected and crits are random/positional", {
            casts: stage.casts("headbutt", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "headbutt lands on a foe within range");
});
