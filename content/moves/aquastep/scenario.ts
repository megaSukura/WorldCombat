/**
 * 流水旋舞 / aquastep 的可执行设计说明。
 *
 * 场面：一只只会流水旋舞的狂欢浪舞鸭与一只弱小的对手相隔 5 格开战，下着雨（雨量让舞步 +1，是本招的世界材料）。
 * 必然事实：本招被提交过、对手受过流水旋舞的伤害。
 * 绕到哪一侧、旋身扫到几个人、暴击，都会随走位变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("aquastep", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("rain");
    var caster = stage.pokemon({ species: "quaquaval", level: 45, moves: ["aquastep"], at: [-2.5, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [2.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("aquastep", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("aquastep", caster) >= 1, "caster committed aqua step");
            stage.expect(stage.damageTo(foe) > 0, "aqua step dealt damage to the foe");
            stage.note("dance side, twirl, the spin's targets and crit vary with positioning; rain adds a step", {
                casts: stage.casts("aquastep", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "aqua step lands within 60 s");
});
