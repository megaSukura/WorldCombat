Smoke.scenario("magneticflux", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "magnemite", level: 32, moves: ["magneticflux"], ability: "sturdy", at: [-1, 0, 0] });
    var ally = stage.mob({ type: "minecraft:iron_golem", at: [0.5, 0, 0] });
    stage.noai(ally);
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("magnet", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("magneticflux", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/magnetized");
    }, function () {
        stage.expect(stage.casts("magneticflux", caster) > 0, "magneticflux was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/magnetized"),
            "the iron golem received magnetic defense");
        stage.expect(stage.attribute(ally, "minecraft:generic.armor") > 0, "the ordinary body gained a real native attribute");
        stage.note("The ordinary iron golem qualifies through its body material; numerical gain is observed through its native attribute.", { stages: stage.stages(ally) });
        stage.done();
    }, "magneticflux links the plus ally");
});
