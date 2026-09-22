/**
 * 藤鞭的可执行设计说明。
 *
 * 场面：一只只会藤鞭的草系精灵（Bellsprout），面对 2.5 格外一只 Zigzagoon。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标被抽中并受到伤害。
 * 触发的是单抽还是双抽、一记抽中几个、有没有暴击，都是配置与位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("vinewhip", function (stage) {
    var caster = stage.pokemon({ species: "Bellsprout", level: 22, moves: ["vinewhip"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Zigzagoon", level: 14, moves: ["tackle"], at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("vinewhip") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("vinewhip") > 0, "vinewhip was committed");
            stage.expect(stage.damageTo(foe) > 0, "the vine whip dealt damage");
            stage.note("vinewhip observations", { casts: stage.casts("vinewhip"),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10, hurtBack: Math.round(stage.damageTo(caster) * 10) / 10 });
            stage.done();
        });
    }, "vinewhip lands");
});
