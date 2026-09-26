/** A fallen native ally is not a fainted party individual; the native CAS fixture covers positive party writes. */
Smoke.scenario("revivalblessing", stage => {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    const caster = stage.pokemon({ species: "gardevoir", level: 55, moves: ["revivalblessing"], at: [-2, 0, 0] });
    const ally = stage.mob({ type: "minecraft:cow", at: [1, 0, 0] });
    const foe = stage.mob({ type: "minecraft:cow", at: [4, 0, 0] }); stage.noai(ally, foe);
    stage.team("prayer", [caster, ally]); stage.hostile(caster, foe);
    stage.after(5, () => stage.hurt(ally, 1000, "minecraft:generic", { source: foe }));
    stage.after(100, () => {
        stage.expect(!ally.alive(), "a real nearby allied body fell");
        stage.expect(stage.casts("revivalblessing", caster) === 0, "a wild caster with no owner roster did not pretend to revive a body");
        stage.expect(stage.pp(caster, "revivalblessing") === 1, "no eligible party member leaves the one PP intact");
        stage.expect(!stage.hadMobEffect(caster, "world_combat:status/revival_blessing"), "no empty blessing is presented as recovery");
        stage.note("positive native party CAS is verified by NativePartyChecks; this scenario verifies no false revival from a nearby unrelated death"); stage.done();
    });
});
