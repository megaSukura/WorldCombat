/**
 * Conversion smoke: a lone Fire Pokemon whose lead move is Normal (Conversion itself, so the move is
 * actually equipped and the wild brain manages it). With no threat it still has the shared fortify
 * goal, so the AI should reweave itself; the assertion is only that the move was committed. Whether
 * the type layer visibly changed is read from the trace's cast line.
 */
Smoke.scenario("conversion", function (stage) {
    var user = stage.pokemon({ species: "charmander", level: 40, moves: ["conversion", "tackle"], at: [0, 0, 0] });
    stage.note("staged: charmander lead=conversion(normal), own type=fire; conversion should fire from the fortify goal");
    stage.until(400, function () { return stage.casts("conversion", user) >= 1; }, function () {
        stage.expect(stage.casts("conversion") >= 1, "conversion was cast");
        stage.note("conversion committed; native type layer is applied through the shared modifier effect", {
            health: user.health()
        });
        stage.done();
    }, "conversion cast");
});
