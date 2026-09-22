/**
 * Sleep Talk smoke: a sleeping friend with one implemented move in its set, facing a zombie so the
 * shared threat/defend path is exercised. The scenario first holds the body awake and checks the
 * move is not offered, then applies sleep and checks it is. Sleep is re-applied while it holds so
 * the native timer cannot run out before the first decision; the trace's committed line shows which
 * move was borrowed.
 *
 * The draw is deterministic in this build: with the group's four units loaded, `conversion` is the
 * only known implemented move, and `sleeptalk`/`tackle` are filtered (self/no-binding).
 */
Smoke.scenario("sleeptalk", function (stage) {
    var user = stage.pokemon({ species: "charmander", level: 40, moves: ["sleeptalk", "conversion", "tackle"], at: [0, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(user, zombie);
    stage.note("awake first: the sleep identity is the move's gate, so it must not be offered yet");
    function keepAsleep() {
        if (stage.casts("sleeptalk", user) >= 1) return;
        stage.command("effect give @e[type=cobblemon:pokemon,limit=1,sort=nearest] world_combat:sleep 20 0 true");
        stage.after(30, keepAsleep);
    }
    stage.after(120, function () {
        stage.expect(stage.casts("sleeptalk", user) === 0, "sleeptalk was not cast while awake");
        stage.note("applying sleep; the same move should now be offered and, with only conversion implemented, draw it");
        keepAsleep();
        stage.until(600, function () { return stage.casts("sleeptalk", user) >= 1; }, function () {
            stage.expect(stage.casts("sleeptalk") >= 1, "sleeptalk was cast");
            stage.note("the borrowed move should be conversion; the committed line shows the caller", { health: user.health() });
            stage.done();
        }, "sleeptalk cast");
    });
});
