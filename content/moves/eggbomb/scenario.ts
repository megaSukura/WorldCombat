/** A single real egg flight reaches the native target; scatter remains a gameplay variation. */
Smoke.scenario("eggbomb", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exeggutor", level: 45, moves: ["eggbomb"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    var landedAt = 0;
    stage.until(900, function () {
        if (landedAt === 0 && stage.casts("eggbomb", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 20;
    }, function () {
        stage.expect(stage.casts("eggbomb", caster) >= 1, "exeggutor committed egg bomb");
        stage.expect(stage.damageTo(foe) > 0, "the hurled egg dealt damage to the foe");
        stage.note("scatter follows level and the heavy choice (native 75 accuracy); a landed egg rolls as a real body and bursts once; the finite roll and shell timing are manual visual checks", {
            casts: stage.casts("eggbomb", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "egg bomb commits and lands within 45 s");
});
