/** A blessing is granted once, survives leaving the singer, and removes the supplied real critical multiplier. */
Smoke.scenario("luckychant", stage => {
    const caster = stage.pokemon({ species: "cherubi", level: 42, moves: ["luckychant"], at: [-2, 0, 0] });
    const ally = stage.mob({ type: "minecraft:cow", at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:husk", at: [5, 0, 0] });
    stage.noai(ally, foe); stage.team("lucky", [caster, ally]); stage.setPp(caster, "luckychant", 1); stage.provoke(caster, foe);
    stage.until(600, () => stage.hasMobEffect(ally, "world_combat:luckychant_ward"), () => {
        stage.expect(stage.casts("luckychant", caster) === 1, "one song grants the blessing to an ordinary native ally");
        const id = ally.ref.split("/")[0], casterId = caster.ref.split("/")[0];
        const point = ally.position();
        stage.command("tp " + id + " " + (point[0] + 25) + " " + point[1] + " " + point[2]);
        stage.command("effect clear " + casterId + " world_combat:luckychant_ward");
        stage.after(8, () => {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:luckychant_ward") && stage.hasMobEffect(ally, "world_combat:luckychant_ward"),
                "the ally keeps its own blessing after leaving and dispelling the singer");
            const before = ally.health();
            stage.hurt(ally, 9, "minecraft:generic", { source: foe, metadata: { critical: true, criticalMultiplier: 2.25, bypassCooldown: true } });
            stage.after(1, () => {
                stage.expect(Math.abs(before - ally.health() - 4) < 0.001, "a 2.25 critical multiplier is removed exactly, not divided by a fixed 1.5");
                stage.note("Independent blessing and scripted critical receipt verified; star placement and native player combat remain playtest observations.",
                    { casts: stage.casts("luckychant", caster), allyHealth: ally.health() });
                stage.done();
            });
        });
    }, "grant a carried blessing");
});
