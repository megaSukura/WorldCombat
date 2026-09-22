/**
 * 神通力的可执行设计说明：让会这一招的噗噗猪（Grumpig，真实学习者）对一只沉睡、停在原地的目标落点。
 *
 * 必然事实：本招被提交过（`stage.casts`）；延迟合拢后攥到目标并造成伤害（`damageTo`）。
 * 10% 畏缩是否触发、以及目标若在延迟里走开会不会落空都写进 note 供读轨迹判断；预判落点由人工试玩核对。
 */
Smoke.scenario("extrasensory", function (stage) {
    stage.fill([-10, -1, -6], [12, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "grumpig", level: 40, moves: ["extrasensory"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("extrasensory", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("extrasensory", caster) >= 1, "the caster committed extrasensory");
            stage.expect(stage.damageTo(foe) > 0, "the unseeable force closed on the sleeping foe and damaged it");
            stage.note("whether the ~10% flinch rolled, and how often a foe that walks away during the delay would escape the point, are random/positional", {
                casts: stage.casts("extrasensory", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch")
            });
            stage.done();
        });
    }, "extrasensory closes on the foe within 70 s");
});
