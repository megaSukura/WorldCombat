// 原生僵尸先交付一次攻击，电/钢使用者观察到全导的减伤价值后通电。
Smoke.scenario("electrify", function (stage) {
    const caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["electrify"], at: [-2, 0, 0] });
    stage.time("night");
    const target = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    stage.after(1, function () {
        stage.prefer(caster, "electrify", { allMoves: true });
        stage.hostile(caster, target);
    });
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:electrified"); }, function () {
        stage.expect(stage.casts("electrify", caster) > 0, "electrify was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:electrified"), "target carries world_combat:electrified");
        stage.note("electrify follows an observed native attack with a defensive type-rewrite benefit; native delivery grouping and consumption are covered by the neutral execution checks",
            { casts: stage.casts("electrify", caster), targetHealth: target.health() });
        stage.done();
    }, "electrified applied");
});
