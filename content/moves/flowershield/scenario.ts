Smoke.scenario("flowershield", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "roselia", level: 32, moves: ["flowershield"], at: [-1, 0, 0] });
    var ally = stage.mob({ type: "minecraft:villager", at: [1, 0, 0] });
    stage.noai(ally);
    stage.command("item replace entity " + ally.ref.split("/")[0] + " weapon.mainhand with minecraft:poppy");
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("garden", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("flowershield", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/petaled")
            && stage.hadMobEffect(ally, "world_combat:status/petaled");
    }, function () {
        stage.expect(stage.casts("flowershield", caster) > 0, "flowershield was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/petaled"), "the Grass caster was shielded by the wave");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/petaled"), "the flower-holding ordinary ally was shielded");
        stage.expect(stage.attribute(ally, "minecraft:generic.armor") > 0, "the flower holder received real armor");
        stage.note("The Grass caster and an ordinary flower holder receive the same shield; enemy flower holders remain eligible too.");
        stage.done();
    }, "flowershield shields the grass ring");
});
