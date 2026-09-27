Smoke.scenario("coil", stage => {
    stage.fill([-9, -1, -5], [9, -1, 5], "minecraft:stone");
    stage.time("day"); stage.weather("clear");
    const caster = stage.pokemon({ species: "ekans", level: 34, moves: ["coil", "tackle"], at: [-3, 0, 0] });
    const foe = stage.mob({ type: "minecraft:cow", at: [1, 0, 0] });
    stage.noai(foe); stage.hostile(caster, foe);
    stage.until(1200, () => stage.casts("coil", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/coil"), () => {
        stage.expect(stage.travelled(caster) > .2, "coil spring moved the real body");
        const stages = stage.stages(caster);
        stage.expect((stages.atk || 0) === 0 && (stages.def || 0) === 0, "coil carries one contact opportunity without an attack/defence stance");
        stage.until(500, () => stage.damageBy(caster) > 0, () => {
            stage.expect(stage.casts("tackle", caster) > 0, "the prepared follow-up was used against an ordinary body");
            stage.after(1, () => {
                stage.expect(!stage.hasMobEffect(caster, "world_combat:status/coil"), "successful physical contact consumed the single spring charge");
                stage.note("AI prepared a real spring and followed with contact; per-hurt reservation/zero-hit rollback are covered by the shared neutral checks. Wall stops and the visible single token need play review.",
                    { casts: stage.casts("coil", caster), followups: stage.casts("tackle", caster), distance: stage.travelled(caster), damage: stage.damageBy(caster) });
                stage.done();
            });
        }, "coil follow-up contact");
    }, "coil spring and ready token");
});
