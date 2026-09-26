/** A temporary exchange must not erase an unrelated later stage gain. */
Smoke.scenario("guardswap", function (stage) {
    const caster = stage.pokemon({ species: "kadabra", level: 40, moves: ["guardswap"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:husk", at: [1, 0, 0] });
    stage.noai(foe);
    stage.boost(foe, { def: 2, spd: 1 });
    stage.provoke(caster, foe);
    stage.until(900, function () { return stage.hadMobEffect(caster, "world_combat:status/guardswap"); }, function () {
        stage.setPp(caster, "guardswap", 0);
        stage.expect(stage.casts("guardswap", caster) > 0, "exchange committed");
        stage.expect(stage.stages(caster).def === 2 && stage.stages(foe).def === 0, "both stage ladders exchanged");
        stage.boost(caster, { def: 1 });
        stage.after(3, function () {
            stage.expect(stage.stages(caster).def === 3, "later gain composes with exchange");
            stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:guardswap_window");
            stage.command("effect clear " + foe.ref.split("/")[0] + " world_combat:guardswap_window");
            stage.after(4, function () {
                stage.expect(stage.stages(caster).def === 1 && stage.stages(foe).def === 2, "only the exchange was removed");
                stage.note("The real Pokemon/non-Pokemon temporary ladders exchanged; a later independent gain survived carrier removal. Visual timing and ally selection remain playtest items.");
                stage.done();
            });
        });
    }, "exchange carrier");
});
