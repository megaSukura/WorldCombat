/** Native delivery and denied payment are exercised beside each other; no visual test is implied. */
Smoke.scenario("explosion", function (stage) {
    stage.time("night"); stage.weather("clear");
    stage.fill([-7, -1, -7], [25, -1, 7], "minecraft:dirt");
    const caster = stage.pokemon({ species: "graveler", level: 40, moves: ["explosion"], at: [0, 0, 0] });
    const refused = stage.pokemon({ species: "graveler", level: 40, moves: ["explosion"], at: [18, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1.8, 0, 0] });
    const refusedFoe = stage.mob({ type: "minecraft:zombie", at: [19.8, 0, 0] });
    stage.noai(foe, refusedFoe);
    [foe, refusedFoe].forEach(target => {
        const uuid = target.ref.split("/")[0];
        stage.command("attribute " + uuid + " minecraft:generic.max_health base set 200");
        stage.command("data merge entity " + uuid + " {Health:200.0f}");
    });
    stage.after(20, function () {
    stage.prefer(caster, "explosion", { ai: { sacrifice: true, minFoes: 1 } });
    stage.prefer(refused, "explosion", { ai: { sacrifice: true, minFoes: 1 } });
    stage.command("data merge entity " + refused.ref.split("/")[0] + " {Invulnerable:1b}");
    stage.provoke(caster, foe); stage.provoke(refused, refusedFoe);
    stage.until(900, () => stage.casts("explosion", caster) > 0 && !caster.alive()
        && stage.damageTo(foe) > 0 && stage.casts("explosion", refused) > 0, function () {
        stage.after(45, function () {
            stage.expect(!caster.alive(), "a complete sacrifice was confirmed");
            stage.expect(stage.damageTo(foe) > 0, "the independent source delivered the blast after death");
            stage.expect(refused.alive(), "native invulnerability refused the health payment");
            stage.expect(stage.damageTo(refusedFoe) === 0, "denied payment granted no blast damage");
            stage.note("The blast uses the original legal recipient snapshot; native death, not source unavailability, activates it.",
                { paidCasts: stage.casts("explosion", caster), refusedCasts: stage.casts("explosion", refused),
                    damage: stage.damageTo(foe), deniedDamage: stage.damageTo(refusedFoe) });
        stage.expect(stage.changedBlocks().length === 0, "the blast leaves visual residue without replacing terrain");
        stage.done();
        });
    }, "confirmed blast and refused payment both resolve");
    });
});
