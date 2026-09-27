/** Native delivery and denied payment are exercised beside each other; no visual test is implied. */
Smoke.scenario("mistyexplosion", function (stage) {
    stage.time("night"); stage.weather("clear");
    stage.fill([-7, -1, -7], [25, -1, 7], "minecraft:dirt");
    const caster = stage.pokemon({ species: "clefairy", level: 40, moves: ["mistyexplosion"], at: [0, 0, 0] });
    const refused = stage.pokemon({ species: "clefairy", level: 40, moves: ["mistyexplosion"], at: [18, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1.8, 0, 0] });
    const refusedFoe = stage.mob({ type: "minecraft:zombie", at: [19.8, 0, 0] });
    stage.noai(foe, refusedFoe);
    [foe, refusedFoe].forEach(target => {
        const uuid = target.ref.split("/")[0];
        stage.command("attribute " + uuid + " minecraft:generic.max_health base set 200");
        stage.command("data merge entity " + uuid + " {Health:200.0f}");
    });
    const ally = stage.mob({ type: "minecraft:villager", at: [0, 0, 2] });
    const refusedAlly = stage.mob({ type: "minecraft:villager", at: [18, 0, 2] });
    stage.noai(ally, refusedAlly);
    stage.team("mist_paid", [caster, ally]); stage.team("mist_refused", [refused, refusedAlly]);
    stage.after(20, function () {
    stage.hurt(caster, caster.health() * .8, "minecraft:magic", { source: foe });
    stage.hurt(refused, refused.health() * .8, "minecraft:magic", { source: refusedFoe });
    stage.command("data merge entity " + refused.ref.split("/")[0] + " {Invulnerable:1b}");
    stage.provoke(caster, foe); stage.provoke(refused, refusedFoe);
    stage.until(900, () => stage.casts("mistyexplosion", caster) > 0 && !caster.alive()
        && stage.damageTo(foe) > 0 && stage.casts("mistyexplosion", refused) > 0, function () {
        stage.after(45, function () {
            stage.expect(!caster.alive(), "a complete sacrifice was confirmed");
            stage.expect(stage.damageTo(foe) > 0, "the independent source delivered the blast after death");
            stage.expect(refused.alive(), "native invulnerability refused the health payment");
            stage.expect(stage.damageTo(refusedFoe) === 0, "denied payment granted no blast damage");
            stage.note("The blast uses the original legal recipient snapshot; native death, not source unavailability, activates it.",
                { paidCasts: stage.casts("mistyexplosion", caster), refusedCasts: stage.casts("mistyexplosion", refused),
                    damage: stage.damageTo(foe), deniedDamage: stage.damageTo(refusedFoe) });
        stage.expect(stage.hadMobEffect(foe, "world_combat:mistyexplosion_haze"), "a damaged ordinary mob received the aim carrier");
        stage.expect((stage.stages(foe).accuracy || 0) < 0, "the confirmed blast owns a real Accuracy reduction");
        stage.expect(!stage.hadMobEffect(refusedFoe, "world_combat:mistyexplosion_haze"), "refused payment grants no aim impairment");
        stage.after(160, function () {
            stage.expect((stage.stages(foe).accuracy || 0) === 0, "the Accuracy contribution expires with its carrier");
            stage.done();
        });
        });
    }, "confirmed blast and refused payment both resolve");
    });
});
