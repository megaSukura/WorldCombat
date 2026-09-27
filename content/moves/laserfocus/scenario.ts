/** Real AI use: an ordinary strike and a move that is already critical both spend one edge. */
Smoke.scenario("laserfocus", stage => {
    stage.time("night");
    const caster = stage.pokemon({ species: "scyther", level: 34, moves: ["laserfocus", "tackle"], at: [0, 0, 0] });
    const natural = stage.pokemon({ species: "scyther", level: 34, moves: ["laserfocus", "frostbreath"], at: [20, 0, 0] });
    const foe = stage.pokemon({ species: "snorlax", level: 60, moves: [], at: [2.4, 0, 0] });
    const naturalFoe = stage.mob({ type: "minecraft:zombie", at: [22.4, 0, 0] });
    stage.noai(foe, naturalFoe);
    [naturalFoe].forEach(actor => {
        const uuid = actor.ref.split("/")[0];
        stage.command("attribute " + uuid + " minecraft:generic.max_health base set 500");
        stage.command("data merge entity " + uuid + " {Health:500.0f}");
    });
    let completed = 0;
    function observe(caster: Smoke.Actor, label: string): void {
        stage.until(300, () => stage.hasMobEffect(caster, "world_combat:status/laserfocus"), () => {
            const started = stage.tick(), criticals = stage.criticals(caster);
            stage.until(60, () => stage.criticals(caster) > criticals, () => {
                stage.after(2, () => {
                    stage.expect(stage.casts("laserfocus", caster) === 1, label + " used one honed edge");
                    stage.expect(stage.tick() - started < 100, label + " settled before natural expiry");
                    stage.expect(!stage.hasMobEffect(caster, "world_combat:status/laserfocus"), label + " consumed the edge on a real critical");
                    if (++completed === 2) {
                        stage.note("Tackle is forced critical; Frost Breath already supplies critical=true. Both consume the carrier after actual HP damage.");
                        stage.done();
                    }
                });
            }, label + " lands a critical within its active edge");
        }, label + " prepares its edge");
    }
    stage.after(20, () => {
        stage.prefer(caster, "laserfocus", { ai: { minGap: 1 } });
        stage.prefer(natural, "laserfocus", { ai: { minGap: 1 } });
        stage.setPp(caster, "laserfocus", 1); stage.setPp(natural, "laserfocus", 1);
        stage.hostile(caster, foe); stage.hostile(natural, naturalFoe);
        observe(caster, "ordinary strike"); observe(natural, "already-critical strike");
    });
});
