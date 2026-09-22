/**
 * 报恩的可执行设计说明。
 *
 * 场面：一只只会报恩的精灵（喵喵，30 级）面对 3 格外的一只僵尸；设为夜晚，避免僵尸被日光灼烧，
 * 伤害只可能来自这招。两者开战，AI 只有这一招可用，会冲上去撞实。
 * 必然事实：本招被提交过；目标受到过伤害（正面撞实）。
 * 具体威力随该精灵当前亲密度变化，撞空与越过落点也是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("return", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Meowth", level: 30, moves: ["return"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("return") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("return") > 0, "return was committed");
            stage.expect(stage.damageTo(foe) > 0, "the return slam dealt damage");
            stage.note("return observations", { casts: stage.casts("return"), onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10 });
            stage.done();
        });
    }, "return lands");
});
