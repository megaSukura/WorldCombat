// Finite snare regression through the registered production field rule.
// Projectile placement and crossing a moving web remain separate manual checks.
Smoke.scenario("stickyweb", function (stage) {
    stage.fill([-8, -1, -5], [8, -1, 5], "minecraft:stone");
    const caster = stage.pokemon({ species: "galvantula", level: 40, moves: ["stickyweb"], at: [-5, 0, 0] });
    const heavy = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    const baseline = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.after(20, function () {
        stage.noai(heavy);
        const foot = heavy.position();
        stage.field("world_combat:hazard/stickyweb", [0, 0, 0], 120, 3, {
            stages: 1, strand: 80, threads: 3, strands: 12, band: 0.4,
            segments: [[foot[0] - 3, foot[1], foot[2], foot[0] + 3, foot[1], foot[2]]], touch: {}
        }, caster);
        stage.until(30, function () { return stage.hasMobEffect(heavy, "world_combat:stickywebbed"); }, function () {
            const slowed = stage.attribute(heavy, "minecraft:generic.movement_speed");
            stage.expect(slowed < baseline, "real web line applies its snare and stage loss");
            stage.expect((stage.stages(heavy).spe || 0) === -1, "the line lowers speed by one stage");
            stage.after(35, function () {
                stage.expect((stage.stages(heavy).spe || 0) === -1, "staying on the line does not accumulate more speed loss");
                stage.command("tp " + heavy.ref.split("/")[0] + " " + (foot[0] + 15) + " " + foot[1] + " " + foot[2]);
                stage.until(150, function () { return !stage.hasMobEffect(heavy, "world_combat:stickywebbed"); }, function () {
                    stage.expect((stage.stages(heavy).spe || 0) === 0, "speed stage recovers when webbing expires");
                    stage.expect(Math.abs(stage.attribute(heavy, "minecraft:generic.movement_speed") - baseline) < 0.001,
                        "native movement attribute recovers with the expired snare");
                    stage.note("Production field contact and lifecycle verified with a fixed line under a native body; this fixture does not validate throw placement.");
                    stage.done();
                }, "snare expires after leaving the line");
            });
        }, "fixed body touches the registered web line");
    });
});
