// Native impact and knockback resistance, with no visual-only status added to either body.
Smoke.scenario("boomburst", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exploud", level: 45, moves: ["boomburst"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2.6, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 1.2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, thick);
    stage.noai(thick);
    stage.until(1200, function () {
        return stage.casts("boomburst", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("boomburst", caster) >= 1, "exploud committed boomburst");
            stage.expect(stage.damageTo(thick) > 0, "the shock wave hit the iron golem");
            stage.expect(!stage.hasMobEffect(thick, "world_combat:deafened"), "the blast does not add a display-only status to the target");
            stage.expect(!stage.hasMobEffect(caster, "world_combat:deafened"), "the caster receives no display-only debuff");
            stage.expect(stage.travelled(thick) < 0.5, "native knockback resistance refused the fling");
            stage.note("how far each target was flung, the distance falloff and the crit roll are random/positional", {
                casts: stage.casts("boomburst", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                thickTravelled: Math.round(stage.travelled(thick) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "boomburst blasts an enemy within 60 s");
});
