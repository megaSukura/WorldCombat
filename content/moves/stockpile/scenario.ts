/** Resource ownership: damage preserves stored layers, full stores release one, removal retains other buffs. */
Smoke.scenario("stockpile", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day"); stage.weather("clear");
    const caster = stage.pokemon({ species: "swalot", level: 30, moves: ["stockpile"], at: [-3, 0, 0] });
    const foe = stage.mob({ type: "minecraft:cow", at: [5, 0, 0] });
    stage.noai(foe); stage.hostile(caster, foe);
    stage.after(5, () => {
    stage.prefer(caster, "stockpile", { break: "mend", ai: { hoardTo: 3, minGap: 0 } });
    stage.boost(caster, { def: 2 });
    stage.until(500, () => stage.casts("stockpile", caster) >= 1, () => {
        const before = stage.stages(caster);
        stage.expect(before.def === 3 && before.spd === 1, "first stored layer adds its own defenses to existing gains");
        stage.hurt(caster, 1, "minecraft:mob_attack", { source: foe });
        stage.after(2, () => {
            const after = stage.stages(caster);
            stage.expect(stage.damageTo(caster) > 0, "the resource check received real hostile damage");
            stage.expect(after.def === before.def && after.spd === before.spd, "taking damage preserves the stored layer");
            stage.until(500, () => stage.casts("stockpile", caster) >= 3, () => {
                const full = stage.stages(caster);
                stage.expect(full.def === 5 && full.spd === 3, "three stored layers retain separate defensive contributions");
                stage.hurt(caster, 40, "minecraft:mob_attack", { source: foe });
                stage.after(2, () => {
                const wounded = caster.health();
                stage.until(250, () => stage.casts("stockpile", caster) >= 4, () => {
                    stage.after(1, () => {
                        const released = stage.stages(caster);
                        stage.expect(released.def === 4 && released.spd === 2, "using a full store spends exactly one owned layer");
                        stage.expect(caster.health() > wounded, "the chosen mend release restored actual health");
                        stage.setPp(caster, "stockpile", 0);
                        stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:stockpile_charge");
                        stage.after(2, () => {
                            const ended = stage.stages(caster);
                            stage.expect(ended.def === 2 && ended.spd === 0, "clearing the shared carrier preserves the unrelated defense boost");
                            stage.note("stored-resource ownership", { casts: stage.casts("stockpile", caster), before, full, released, ended });
                            stage.done();
                        });
                    });
                }, "full stockpile releases one breath");
                });
            }, "stockpile reaches three layers");
        });
    }, "stockpile creates a stored layer");
    });
});
