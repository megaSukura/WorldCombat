Smoke.scenario("powersplit", stage => {
    stage.fill([-8, -1, -5], [8, -1, 5], "minecraft:stone"); stage.time("day"); stage.weather("clear");
    const caster = stage.pokemon({ species: "chansey", level: 40, moves: ["powersplit", "tackle"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:cow", at: [1, 0, 0] });
    stage.noai(foe);
    const metadata = { kind: "move", category: "physical", contact: true, type: "normal", critical: false, bypassAccuracy: true, bypassCooldown: true };
    stage.after(10, () => {
        const id = foe.ref.split("/")[0];
        stage.command("attribute " + id + " minecraft:generic.max_health base set 100");
        stage.command("data merge entity " + id + " {Health:100f}");
        stage.hurt(foe, 1, "world_combat_core:action_independent", { source: caster, metadata });
        stage.hurt(caster, 8, "world_combat_core:action_independent", { source: foe, metadata });
        stage.hostile(caster, foe);
    });
    stage.until(1000, () => stage.casts("powersplit", caster) > 0 && stage.hasMobEffect(caster, "world_combat:status/powersplit"), () => {
        // The three controlled hurts run synchronously during recovery; no entity NBT reload is needed.
        const attackStage = stage.stages(caster).atk || 0, armor = stage.attribute(foe, "minecraft:generic.armor");
        const before = stage.damageTo(foe);
        stage.hurt(foe, 8, "world_combat_core:action_independent", { source: caster, metadata });
        const first = stage.damageTo(foe) - before;
        stage.expect(Math.abs(first - 4) < .01, "first successful direct hit sends half of its owned HP budget");
        stage.hurt(caster, 10, "world_combat_core:action_independent", { source: foe, metadata });
        const received = stage.damageTo(foe);
        stage.hurt(foe, 8, "world_combat_core:action_independent", { source: caster, metadata });
        stage.expect(Math.abs(stage.damageTo(foe) - received - 13) < .01, "the first donor later receives exactly half of the partner's own ten-HP attack");
        stage.expect((stage.stages(caster).atk || 0) === attackStage && stage.attribute(foe, "minecraft:generic.armor") === armor,
            "Power Split leaves attack stages and native armor unchanged, including a body with no attack attribute");
        stage.after(2, () => {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powersplit") && !stage.hasMobEffect(foe, "world_combat:status/powersplit"),
                "one send and one receive each ends both endpoints");
            stage.note("The AI used a recent direct hit from an ordinary body to choose its link. Three real independent-action hurts verify the 8→4, 10→5+4, 8→8+5 exchange; full absorption/cancellation and nested reservation isolation have separate shared checks.");
            stage.done();
        });
    }, "Power Split linked an ordinary opponent");
});
