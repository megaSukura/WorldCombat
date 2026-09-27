Smoke.scenario("memento", function (stage) {
    stage.time("night");
    const caster = stage.pokemon({ species: "munchlax", level: 24, moves: ["memento"], at: [0, 0, 0] });
    const refused = stage.pokemon({ species: "munchlax", level: 24, moves: ["memento"], at: [18, 0, 0] });
    const foe = stage.mob({ type: "minecraft:zombie", at: [1.2, 0, 0] });
    const refusedFoe = stage.mob({ type: "minecraft:zombie", at: [19.2, 0, 0] });
    const ally = stage.mob({ type: "minecraft:villager", at: [0, 0, 2] });
    const refusedAlly = stage.mob({ type: "minecraft:villager", at: [18, 0, 2] });
    stage.noai(foe, refusedFoe, ally, refusedAlly);
    stage.team("memento_paid", [caster, ally]); stage.team("memento_refused", [refused, refusedAlly]);
    stage.after(20, function () {
    const attack = stage.attribute(foe, "minecraft:generic.attack_damage");
    const refusedAttack = stage.attribute(refusedFoe, "minecraft:generic.attack_damage");
    stage.hurt(caster, caster.health() * .9, "minecraft:magic", { source: foe });
    stage.hurt(refused, refused.health() * .9, "minecraft:magic", { source: refusedFoe });
    stage.command("data merge entity " + refused.ref.split("/")[0] + " {Invulnerable:1b}");
    stage.provoke(caster, foe); stage.provoke(refused, refusedFoe);
    stage.until(900, () => stage.casts("memento", caster) > 0 && !caster.alive()
        && stage.hadMobEffect(foe, "world_combat:status/grieving")
        && stage.attribute(foe, "minecraft:generic.attack_damage") < attack
        && stage.casts("memento", refused) > 0, function () {
        stage.after(16, function () {
            stage.expect(!caster.alive(), "Memento's independent remnant follows a real sacrifice");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/grieving"), "confirmed sacrifice grants initial grief");
            stage.expect(stage.attribute(foe, "minecraft:generic.attack_damage") < attack, "the active remnant weakens its original foe");
            stage.expect(refused.alive(), "native invulnerability keeps the denied payer alive");
            stage.expect(!stage.hadMobEffect(refusedFoe, "world_combat:status/grieving"), "no initial grief before a confirmed sacrifice");
            stage.expect(stage.attribute(refusedFoe, "minecraft:generic.attack_damage") === refusedAttack, "denied payment leaves no remnant weakening");
            stage.note("The remnant retains the original enemy snapshot and checks present range and walls on each visit.");
            stage.done();
        });
    }, "Memento delivers after death while rejected sacrifice stays inert");
    });
});
