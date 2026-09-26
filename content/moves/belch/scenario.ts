/** A real berry funds one gas cone and its native on-eat effect. */
Smoke.scenario("belch", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "weezing", level: 40, moves: ["belch"], item: "cobblemon:oran_berry", at: [-2.6, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [0.8, 0, 0] });
    stage.hostile(caster, thick);
    stage.until(900, function () {
        return stage.casts("belch", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("belch", caster) >= 1, "weezing committed belch");
            stage.expect(stage.damageTo(thick) > 0, "the gas cloud hit the iron golem");
            stage.expect(stage.heldItem(caster) === "", "one real berry was consumed before emitting gas");
            stage.note("the caster starts holding an Oran Berry, which belch consumes on the first use, so it can belch exactly once; whether the golem was poisoned and the crit roll are random", {
                casts: stage.casts("belch", caster),
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                poisoned: stage.hadMobEffect(thick, "world_combat:status/poison"),
                thickAlive: thick.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "belch eats its Berry and sprays a foe within 45 s");
});
