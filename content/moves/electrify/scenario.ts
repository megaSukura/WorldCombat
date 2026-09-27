// 纯电使用者见证原生僵尸的一次攻击：普通攻击对电系 1×、改电后 0.5×，伙伴据此通电。
Smoke.scenario("electrify", function (stage) {
    const caster = stage.pokemon({ species: "pikachu", level: 35, moves: ["electrify"], at: [-2, 0, 0] });
    stage.time("night");
    const target = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    stage.after(1, function () {
        stage.prefer(caster, "electrify", { allMoves: true });
        stage.hostile(caster, target);
    });
    stage.until(900, function () { return stage.hadMobEffect(target, "world_combat:electrified"); }, function () {
        stage.expect(stage.casts("electrify", caster) > 0, "electrify was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:electrified"), "target carries world_combat:electrified");
        stage.note("electrify follows the zombie's classified normal attack; the native element rewrite and its once-per-execution latch are covered by the neutral execution checks",
            { casts: stage.casts("electrify", caster), targetHealth: target.health() });
        stage.done();
    }, "electrified applied");
});
