Smoke.scenario("embargo", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Umbreon", level: 30, moves: ["embargo"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:pillager", at: [3, 0, 0] });
    stage.noai(foe);
    stage.command("item replace entity " + foe.ref.split("/")[0] + " weapon.mainhand with minecraft:crossbow");
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("embargo", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/embargo");
    }, function () {
        stage.expect(stage.casts("embargo", caster) > 0, "查封被放出来了");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/embargo"), "目标身上出现了查封的共享身份");
        stage.expect(stage.heldItem(foe) === "minecraft:crossbow", "the sealed item stays in the ordinary target's hand");
        stage.note("The ordinary crossbow holder passed the AI item gate and received Embargo. Native item-use cancellation is covered by the shared server check.");
        stage.done();
    }, "查封生效");
});
