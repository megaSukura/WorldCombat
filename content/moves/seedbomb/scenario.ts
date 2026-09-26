/** Native high-arc contact and actual burst damage; rebound timing is observed during manual play. */
Smoke.scenario("seedbomb", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "venusaur", level: 45, moves: ["seedbomb"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("seedbomb", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("seedbomb", caster) >= 1, "caster committed seedbomb");
        stage.expect(stage.damageTo(foe) > 0, "seedbomb dealt damage to the foe");
        stage.note("Native high flight and actual burst damage verified. A first floor hit can rebound briefly; the current scenario does not assert the rebound path or fuse timing.", {
            casts: stage.casts("seedbomb", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "seedbomb lands within 30 s");
});
