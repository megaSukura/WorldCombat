/** Engineering regression: the three-beat beam only bites the first visible enemy along its locked ray. */
Smoke.scenario("aeroblast", function (stage) {
    stage.fill([-16, -1, -8], [16, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lugia", level: 60, moves: ["aeroblast"], at: [-8, 0, 0] });
    var primary = stage.mob({ type: "minecraft:husk", at: [3, 0, 0] });
    var offAxis = stage.mob({ type: "minecraft:silverfish", at: [3, 0, 2] });
    stage.noai(primary, offAxis);
    stage.after(20, function () {
        stage.command("attribute " + offAxis.ref.split("/")[0] + " minecraft:generic.max_health base set 1000");
        stage.command("data merge entity " + offAxis.ref.split("/")[0] + " {Health:1000.0f}");
        stage.setPp(caster, "aeroblast", 1);
        stage.expect(caster.alive() && offAxis.health() === 1000, "the off-axis bystander is staged at full health");
        stage.provoke(caster, primary);
        stage.until(600, function () { return stage.hits(primary, true) > 0; }, function () {
            stage.after(1, function () {
                stage.expect(stage.casts("aeroblast", caster) === 1, "one paid cast owns the three-beat beam");
                stage.expect(stage.damageTo(primary) > 0, "the first visible enemy along the ray takes the vortex");
                stage.expect(stage.damageTo(offAxis) === 0, "an off-axis body is not caught by the pinpoint beam");
                stage.note("How many of the three beats land on the front foe, the native high-crit roll and wall truncation remain playtest observations.", {
                    casts: stage.casts("aeroblast", caster),
                    primaryDamage: Math.round(stage.damageTo(primary) * 10) / 10,
                    offAxisDamage: Math.round(stage.damageTo(offAxis) * 10) / 10
                });
                stage.done();
            });
        }, "aeroblast reaches and settles the front foe within 30 seconds");
    });
});
