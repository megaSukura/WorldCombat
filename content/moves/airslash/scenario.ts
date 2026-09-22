/**
 * 空气斩的可执行设计说明：让会这一招的音波龙（Noivern，真实学习者）对两只排成一列、沉睡的远距目标放刃。
 *
 * 必然事实：本招被提交过（`stage.casts`）；刃切到前排目标并造成伤害（`damageTo`）。
 * 贯穿是否切到第二只、30% 畏缩是否触发都写进 note 供读轨迹判断；起手窗口里对手能走位躲开由人工试玩核对。
 */
Smoke.scenario("airslash", function (stage) {
    stage.fill([-12, -1, -6], [12, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "noivern", level: 40, moves: ["airslash"], at: [-7, 0, 0] });
    var front = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [2, 0, 0] });
    var back = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [5, 0, 0] });
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.until(1400, function () {
        return stage.casts("airslash", caster) >= 1 && stage.damageTo(front) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("airslash", caster) >= 1, "the caster committed air slash");
            stage.expect(stage.damageTo(front) > 0, "the air blade reached and damaged the front foe");
            stage.note("whether the blade pierced through to the back foe and whether the 30% flinch rolled are random", {
                casts: stage.casts("airslash", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                backDamage: Math.round(stage.damageTo(back) * 10) / 10,
                frontFlinched: stage.hadMobEffect(front, "world_combat:status/flinch"),
                backFlinched: stage.hadMobEffect(back, "world_combat:status/flinch")
            });
            stage.done();
        });
    }, "air slash reaches the front foe within 70 s");
});
