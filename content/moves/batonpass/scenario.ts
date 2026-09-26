Smoke.scenario("batonpass", stage => {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone"); stage.time("day");
    const caster = stage.pokemon({ species: "scyther", level: 35, moves: ["batonpass"], at: [-2, 0, 0] });
    const ally = stage.pokemon({ species: "snorlax", level: 40, moves: [], at: [2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [7, 0, 3] }); stage.noai(foe);
    stage.team("baton", [caster, ally]); stage.hostile(ally, foe); stage.hostile(caster, foe);
    stage.after(5, () => stage.boost(caster, { atk: 2 }));
    stage.until(1200, () => stage.casts("batonpass", caster) > 0 && (stage.stages(ally).atk || 0) >= 2 && stage.travelled(caster) > .3, () => {
        stage.expect((stage.stages(caster).atk || 0) === 0, "the giver lost the transferred stages");
        stage.expect((stage.stages(ally).atk || 0) === 2, "the selected live ally received the actual two stages");
        stage.expect(stage.hasMobEffect(ally, "world_combat:status/baton_pass"), "the successful handoff is visible");
        stage.expect(stage.travelled(caster) > .3, "the giver withdrew through real movement");
        stage.note("live handoff", { given: stage.stages(caster), received: stage.stages(ally), travelled: stage.travelled(caster) }); stage.done();
    }, "actual stages reach the chosen ally");
});
