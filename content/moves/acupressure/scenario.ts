/** 一轮点穴只强化一项，停止后续施放后，状态与强化一起结束。 */
Smoke.scenario("acupressure", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "machop", level: 24, moves: ["acupressure"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("acupressure", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/acupressure");
    }, function () {
        stage.expect(stage.casts("acupressure", caster) > 0, "acupressure was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/acupressure"), "the flow window carried the shared identity");
        stage.setPp(caster, "acupressure", 0);
        const raised = stage.stages(caster), positive = Object.keys(raised).filter(function (stat) { return raised[stat] > 0; });
        stage.expect(positive.length === 1, "one Acupressure window raised exactly one stat");
        stage.expect(raised[positive[0]] === 1, "the quick press raised one stage");
        stage.note("The random stat belongs to this visible flow window; the fast mode grants one stage.", { stages: raised });
        stage.until(480, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/acupressure");
        }, function () {
            const after = stage.stages(caster);
            stage.expect(Object.keys(after).every(function (stat) { return after[stat] === 0; }), "the expired flow left no stat gain");
            stage.note("The status expired and its owned contribution ended.", {
                casts: stage.casts("acupressure", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        }, "acupressure expires with its stat gain");
    }, "acupressure engages");
});
