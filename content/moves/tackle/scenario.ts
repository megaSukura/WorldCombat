/**
 * 撞击的可执行设计说明。
 *
 * 场面：一只只会撞击的轻型精灵（Rattata），面对 3 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一撞。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（正面撞实）。
 * 撞空、从身侧滑过的具体落点、暴击，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("tackle", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Rattata", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("tackle") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("tackle") > 0, "tackle was committed");
            stage.expect(stage.damageTo(foe) > 0, "the tackle dealt damage");
            stage.note("tackle observations", { casts: stage.casts("tackle"), onFoe: stage.damageTo(foe),
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: stage.damageTo(caster) });
            stage.done();
        });
    }, "tackle lands");
});
