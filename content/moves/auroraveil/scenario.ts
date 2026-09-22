// Verify the snowstorm gate, protected membership and actual hostile damage reduction on an ordinary mob.
Smoke.scenario("auroraveil", function (stage) {
    stage.weather("thunder");
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:snow_block");
    var caster = stage.pokemon({ species: "lapras", level: 40, moves: ["auroraveil"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    var covered = stage.mob({ type: "minecraft:iron_golem", at: [-2, 0, 1] });
    var outside = stage.mob({ type: "minecraft:iron_golem", at: [10, 0, 0] });
    stage.team("veil_receivers", [caster, covered, outside]);
    stage.noai(covered, outside, foe);
    stage.setPp(foe, "tackle", 0);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("auroraveil", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/auroraveil") && stage.hasMobEffect(covered, "world_combat:status/auroraveil");
    }, function () {
        stage.expect(stage.casts("auroraveil", caster) > 0, "auroraveil was cast under the snowstorm");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/auroraveil"), "caster carried the shared auroraveil identity");
        stage.setPp(caster, "auroraveil", 0);
        var coveredBefore = stage.damageTo(covered), outsideBefore = stage.damageTo(outside);
        stage.hurt(covered, 4, "minecraft:generic", { source: foe, metadata: { category: "physical", sureHit: true } });
        stage.hurt(outside, 4, "minecraft:generic", { source: foe, metadata: { category: "physical", sureHit: true } });
        stage.after(2, function () {
            const protectedLoss = stage.damageTo(covered) - coveredBefore, plainLoss = stage.damageTo(outside) - outsideBefore;
            stage.expect(plainLoss > 0 && protectedLoss > 0 && protectedLoss < plainLoss, "hostile native damage is reduced for an allied ordinary mob inside the veil");
            stage.note("Identical hostile physical hits on two ordinary iron golems; only the golem inside the veil is protected.", { protectedLoss: protectedLoss, plainLoss: plainLoss });
            stage.done();
        });
    }, "auroraveil covers the caster");
});
