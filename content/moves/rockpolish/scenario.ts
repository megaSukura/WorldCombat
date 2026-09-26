/** The native movement coefficient and owned Speed layer end together, preserving later gains. */
Smoke.scenario("rockpolish", stage => {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    const caster = stage.pokemon({ species: "onix", level: 32, moves: ["rockpolish"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:husk", at: [10, 0, 0] });
    stage.noai(foe); stage.setPp(caster, "rockpolish", 1); stage.provoke(caster, foe);
    stage.until(600, () => stage.casts("rockpolish", caster) > 0 && stage.attribute(caster, "world_combat:ground_slipperiness") > 0, () => {
        stage.expect(stage.hasMobEffect(caster, "world_combat:status/polished"), "polish has a native carrier");
        stage.expect((stage.stages(caster).spe || 0) >= 2, "the temporary Speed contribution is active");
        stage.expect(stage.changedBlocks().length === 0, "polishing the body leaves terrain unchanged");
        stage.boost(caster, { spe: 1 });
        stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:rock_polish_shine");
        stage.after(4, () => {
            stage.expect(stage.attribute(caster, "world_combat:ground_slipperiness") === 0, "native ground friction returns after clearing polish");
            stage.expect(stage.stages(caster).spe === 1, "clearing polish preserves the later independent Speed gain");
            stage.note("Native inertia is covered by the core locomotion fixture; short glide and scratch placement require playtest.");
            stage.done();
        });
    }, "polish contributes speed and native slipperiness");
});
