/** A fixed fan samples each advancing band at release time. Moving away avoids a later band. */
Smoke.scenario("razorwind", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 24], "minecraft:stone");
    stage.time("day");
    var caster = stage.pokemon({ species: "absol", level: 45, moves: ["razorwind"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    stage.noai(foe); stage.provoke(caster, foe);
    stage.until(700, function () { return stage.casts("razorwind", caster) >= 1; }, function () {
        stage.setPp(caster, "razorwind", 0);
        stage.command("tp " + foe.ref.split("/")[0] + " ~5 ~ ~20");
        stage.after(18, function () {
            stage.expect(stage.damageTo(foe) === 0, "moving beyond the pending fan avoided its later bands");
            stage.command("tp " + foe.ref.split("/")[0] + " ~5 ~ ~");
            stage.command("tp " + caster.ref.split("/")[0] + " ~-4 ~ ~");
            stage.setPp(caster, "razorwind", 1); stage.provoke(caster, foe);
            stage.after(10, function () { stage.provoke(caster, foe); });
            stage.until(700, function () { return stage.damageTo(foe) > 0; }, function () {
                stage.expect(stage.casts("razorwind", caster) === 2, "the stationary target was reached by the next paid fan");
                stage.expect(stage.hits(foe, true) === 1, "one advancing fan hit the target once");
                stage.note("Band membership is current; the first cast remained fixed when the target left, the second hit once. Fan appearance remains manual.");
                stage.done();
            }, "the next fan reaches the stationary target");
        });
    }, "the first fan commits");
});
