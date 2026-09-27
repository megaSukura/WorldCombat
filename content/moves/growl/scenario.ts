// Verify the actual native attack contribution, its expiry, cleansing and independent changes.
Smoke.scenario("growl", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "eevee", level: 35, moves: ["growl"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.noai(target);
    var baseAttack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.provoke(caster, target);
    stage.until(500, function () { return stage.hasMobEffect(target, "world_combat:growl_hush"); }, function () {
        stage.expect(stage.stages(target).atk === -1, "one growl lowers Attack by one stage");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < baseAttack, "the ordinary mob's real Attack falls");
        var casts = stage.casts("growl", caster);
        stage.after(110, function () {
            stage.expect(stage.hasMobEffect(target, "world_combat:growl_hush"), "the original distraction is still active");
            stage.expect(stage.casts("growl", caster) === casts, "AI does not spend another cry on the same active distraction");
            stage.expect(stage.stages(target).atk === -1, "the distraction has not stacked deeper");
            stage.setPp(caster, "growl", 0);
            stage.boost(target, { atk: 1 });
            stage.until(280, function () { return !stage.hasMobEffect(target, "world_combat:growl_hush"); }, function () {
                stage.after(2, function () {
                    stage.expect(stage.stages(target).atk === 1, "expiry removes only Growl and retains an independent Attack increase");
                    stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") > baseAttack, "native attack restores with the separate increase intact");
                    stage.setPp(caster, "growl", 1);
                    stage.until(400, function () { return stage.hasMobEffect(target, "world_combat:growl_hush"); }, function () {
                        stage.expect(stage.stages(target).atk === 0, "a later distraction acts on the current independent baseline");
                        stage.setPp(caster, "growl", 0);
                        stage.command("effect clear " + String(target.ref).split("/")[0] + " world_combat:growl_hush");
                        stage.after(2, function () {
                            stage.expect(stage.stages(target).atk === 1, "cleansing removes the exact distraction contribution");
                            stage.expect(!stage.hasMobEffect(target, "world_combat:growl_hush"), "no display-only status remains");
                            stage.note("Timed attack loss, no repeated stacking, native expiry and cleansing preserve a separately granted stage.");
                            stage.done();
                        });
                    }, "growl can affect the opponent after the first distraction ends");
                });
            }, "the distraction expires during the ongoing encounter");
        });
    }, "growl applies a timed attack loss to an ordinary mob");
});
