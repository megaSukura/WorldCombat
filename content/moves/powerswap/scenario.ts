/** A temporary exchange must not erase an unrelated later stage gain. */
Smoke.scenario("powerswap", function (stage) {
    const caster = stage.pokemon({ species: "kadabra", level: 40, moves: ["powerswap"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:husk", at: [1, 0, 0] });
    stage.noai(foe);
    stage.boost(foe, { atk: 2, spa: 1 });
    stage.provoke(caster, foe);
    stage.until(900, function () { return stage.hadMobEffect(caster, "world_combat:status/powerswap"); }, function () {
        stage.setPp(caster, "powerswap", 0);
        stage.expect(stage.casts("powerswap", caster) > 0, "exchange committed");
        stage.expect(stage.stages(caster).atk === 2 && stage.stages(foe).atk === 0, "both stage ladders exchanged");
        stage.boost(caster, { atk: 1 });
        stage.after(3, function () {
            stage.expect(stage.stages(caster).atk === 3, "later gain composes with exchange");
            stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:powerswap_window");
            stage.command("effect clear " + foe.ref.split("/")[0] + " world_combat:powerswap_window");
            stage.after(4, function () {
                stage.expect(stage.stages(caster).atk === 1 && stage.stages(foe).atk === 2, "only the exchange was removed");
                stage.note("The real Pokemon/non-Pokemon temporary ladders exchanged; a later independent gain survived carrier removal. Visual timing and ally selection remain playtest items.");
                stage.done();
            });
        });
    }, "exchange carrier");
});
