let smokeLastRespectsCaster = "", smokeLastRespectsFallen = 0;
WorldCombat.on("world_combat:scenario_lastrespects/observe", "world_combat:actor_tick", "", event => {
    if (smokeLastRespectsCaster && String(event.actor().ref()).indexOf(smokeLastRespectsCaster) === 0)
        smokeLastRespectsFallen = CombatEncounters.fallen(event.world(), event.actor());
});
/** A shared-opponent ally death feeds the independently travelling native ghost flight. */
Smoke.scenario("lastrespects", function (stage) {
    stage.fill([-18, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "duskull", level: 35, moves: ["lastrespects"], at: [-14, 0, 0] });
    var ally = stage.mob({ type: "minecraft:chicken", at: [2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.team("pine", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    smokeLastRespectsCaster = caster.ref; smokeLastRespectsFallen = 0;
    stage.after(25, () => stage.command("damage " + ally.ref.split("/")[0] + " 100 minecraft:mob_attack by " + foe.ref.split("/")[0]));
    stage.until(1100, function () {
        return stage.casts("lastrespects", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(16, function () {
            stage.expect(stage.casts("lastrespects", caster) > 0, "duskull committed last respects");
            stage.expect(stage.damageTo(foe) > 0, "the mourning strike dealt damage");
            stage.expect(smokeLastRespectsFallen === 1, "One confirmed allied death in this shared encounter fed the procession");
            stage.note("the teammate chicken was meant to fall to the zombie before the caster arrived; the fallen count is what feeds the power term", {
                casts: stage.casts("lastrespects", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                allyAlive: ally.alive(), fallen: smokeLastRespectsFallen,
                foeAlive: foe.alive(),
                casterMoved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "last respects lands on the foe within 55 s");
});
