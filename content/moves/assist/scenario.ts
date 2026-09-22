/**
 * Assist smoke: a Fire Pokemon that knows Assist, a same-team ally that knows Conversion, and a
 * zombie inside reach so the attack goal is offered. The only implemented move in the ally's set is
 * Conversion, so the borrow is deterministic and the assertion is that Assist itself was committed.
 */
Smoke.scenario("assist", function (stage) {
    var user = stage.pokemon({ species: "charmander", level: 40, moves: ["assist", "tackle"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "squirtle", level: 40, moves: ["conversion", "tackle"], at: [3, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.team("assist", [user, ally]);
    stage.hostile(user, zombie);
    stage.note("staged: charmander knows assist+tackle, ally squirtle knows conversion; the borrowed move should be conversion");
    stage.until(600, function () { return stage.casts("assist", user) >= 1; }, function () {
        stage.expect(stage.casts("assist") >= 1, "assist was cast");
        stage.note("the ally pool only holds conversion, so the borrow settled there; read the committed line", {
            health: user.health(),
            allyHealth: ally.health()
        });
        stage.done();
    }, "assist cast");
});
