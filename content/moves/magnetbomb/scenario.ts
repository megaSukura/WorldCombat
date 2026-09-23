/** Engineering regression: a lethal primary hit keeps the independent point and bystander damage. */
Smoke.scenario("magnetbomb", function (stage) {
    stage.fill([-16, -1, -8], [16, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnezone", level: 40, moves: ["magnetbomb"], at: [-2, 0, 0] });
    var primary = stage.mob({ type: "minecraft:husk", at: [3, 0, 0] });
    var bystander = stage.mob({ type: "minecraft:silverfish", at: [3, 0, 0.8] });
    stage.noai(primary, bystander);
    stage.after(20, function () {
        stage.command("data merge entity " + primary.ref.split("/")[0] + " {Health:1.0f}");
        stage.command("attribute " + bystander.ref.split("/")[0] + " minecraft:generic.max_health base set 1000");
        stage.command("data merge entity " + bystander.ref.split("/")[0] + " {Health:1000.0f}");
        stage.prefer(caster, "magnetbomb", { cluster: true });
        stage.setPp(caster, "magnetbomb", 1);
        stage.expect(caster.alive() && primary.health() === 1 && bystander.health() === 1000, "the lethal primary and surviving bystander are staged");
        stage.provoke(caster, primary);
        stage.until(600, function () { return stage.hits(primary, true) > 0; }, function () {
            stage.after(1, function () {
                var receipts = stage.damageEvents(), primaryAt = -1, splashAt = -1;
                for (var i = 0; i < receipts.length; i++) {
                    if (receipts[i].from !== caster.name) continue;
                    if (receipts[i].to === primary.name && primaryAt < 0) primaryAt = i;
                    if (receipts[i].to === bystander.name && splashAt < 0) splashAt = i;
                }
                stage.expect(stage.casts("magnetbomb", caster) === 1, "one paid cast owns the primary hit and its aftermath");
                stage.expect(stage.hadMobEffect(primary, "world_combat:status/magnetbomb"), "the primary carried the fused charge before detonation");
                stage.expect(!stage.hadMobEffect(bystander, "world_combat:status/magnetbomb"), "the bystander receives splash rather than an attached bomb");
                stage.expect(!primary.alive() && stage.hits(primary, true) === 1, "the first primary hit is lethal");
                stage.expect(bystander.alive() && stage.damageTo(bystander) > 0, "the surviving bystander receives splash after the lethal primary hit");
                stage.expect(primaryAt >= 0 && splashAt > primaryAt, "the splash receipt follows the primary death receipt");
                stage.note("Technical lethal-hit regression; particle appearance remains a playtest observation.", {
                    primaryDamage: stage.damageTo(primary), bystanderDamage: stage.damageTo(bystander),
                    primaryAlive: primary.alive(), bystanderAlive: bystander.alive(), receipts: receipts
                });
                stage.done();
            });
        }, "magnetbomb reaches and settles the staged primary within 30 seconds");
    });
});
