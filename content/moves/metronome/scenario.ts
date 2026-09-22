/**
 * Metronome smoke: a Fire Pokemon knowing only Metronome among implemented moves, facing a zombie so
 * the attack goal is proposed. With the group's units loaded, `conversion` is the only implemented
 * move carrying the native `flags.metronome` marker, so the draw should settle on it; the assertion
 * is that Metronome itself was committed.
 */
Smoke.scenario("metronome", function (stage) {
    var user = stage.pokemon({ species: "charmander", level: 40, moves: ["metronome", "tackle"], at: [0, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(user, zombie);
    stage.note("staged: charmander knows metronome+tackle; conversion is the only implemented move with flags.metronome");
    stage.until(600, function () { return stage.casts("metronome", user) >= 1; }, function () {
        stage.expect(stage.casts("metronome") >= 1, "metronome was cast");
        stage.note("draw should have been conversion; read the committed line and any damage line in the trace", {
            health: user.health()
        });
        stage.done();
    }, "metronome cast");
});
