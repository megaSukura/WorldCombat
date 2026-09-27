/** Gloom wakes a stationary allied vanilla sheep through the shared sleep carrier; an unsuppressible Komala is not selected. */
Smoke.scenario("worryseed", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    stage.time("day");
    var caster = stage.pokemon({ species: "Gloom", level: 40, moves: ["worryseed"], at: [-2, 0, 0] });
    var ally = stage.mob({ type: "minecraft:sheep", at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Komala", level: 30, moves: [], at: [3, 0, 0], ability: "comatose" });
    stage.team("worry", [caster, ally]);
    stage.noai(ally, foe);
    stage.after(5, function () {
        stage.command("effect give " + ally.ref.split("/")[0] + " world_combat:sleep 30 0 true");
    });
    stage.hostile(caster, foe);
    stage.note("staged: a plain allied sheep receives actual shared sleep after spawn; Gloom should wake it without an Ability branch. The unsuppressible Komala remains unseeded.");
    stage.until(1400, function () { return stage.hadMobEffect(ally, "world_combat:status/worryseed"); }, function () {
        stage.expect(stage.casts("worryseed", caster) >= 1, "worryseed was committed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/sleep"), "the ally had carried the sleep identity before the seed");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/worryseed"), "the worry-seed status appeared on the sleeping ally");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/sleep"), "the seed woke the sleeping ally");
        stage.expect(!stage.hasMobEffect(foe, "world_combat:status/worryseed"), "the unsuppressible foe was not seeded");
        stage.note("worryseed committed; the seed is a real homing projectile, and rules.ts blocks sleep for any worry-seed or Insomnia holder. The ally was woken and protected; the comatose foe was refused by the native cantsuppress rule.", {
            casts: stage.casts("worryseed", caster),
            allySleepEver: stage.hadMobEffect(ally, "world_combat:status/sleep"),
            allySleepNow: stage.hasMobEffect(ally, "world_combat:status/sleep"),
            allySeedNow: stage.hasMobEffect(ally, "world_combat:status/worryseed"),
            foeSeedNow: stage.hasMobEffect(foe, "world_combat:status/worryseed")
        });
        stage.done();
    }, "worry seed reaches the sleeping ally");
});
