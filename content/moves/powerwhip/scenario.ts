/**
 * 强力鞭打的可执行设计说明。
 *
 * 场面：一只只会强力鞭打的草系精灵（Bellsprout），面对 3 格外挤在一起的两只 Zigzagoon。三者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；弧面范围内至少有一个目标被扫中并受到伤害。
 * 一次扫中几个、有没有暴击、有没有把人推出弧面，都是位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("powerwhip", function (stage) {
    var caster = stage.pokemon({ species: "Bellsprout", level: 45, moves: ["powerwhip"], at: [0, 0, 0] });
    var first = stage.pokemon({ species: "Zigzagoon", level: 18, moves: ["tackle"], at: [3, 0, 0] });
    var second = stage.pokemon({ species: "Zigzagoon", level: 18, moves: ["tackle"], at: [3, 0, 1.2] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("powerwhip") > 0 && stage.damageTo(first) + stage.damageTo(second) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("powerwhip") > 0, "powerwhip was committed");
            stage.expect(stage.damageTo(first) + stage.damageTo(second) > 0, "the lash dealt damage");
            stage.note("powerwhip observations", { casts: stage.casts("powerwhip"),
                first: Math.round(stage.damageTo(first) * 10) / 10, second: Math.round(stage.damageTo(second) * 10) / 10,
                firstMoved: Math.round(stage.travelled(first) * 10) / 10, secondMoved: Math.round(stage.travelled(second) * 10) / 10 });
            stage.done();
        });
    }, "powerwhip lands");
});
