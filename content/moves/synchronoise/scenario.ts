Smoke.scenario("synchronoise", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "banette", level: 40, moves: ["synchronoise"], at: [0, 0, 0] });
    var match = stage.mob({ type: "minecraft:zombified_piglin", at: [3, 0, 0] });
    var mismatch = stage.mob({ type: "minecraft:cow", at: [3, 0, 1.6] });
    stage.noai(match, mismatch);
    stage.command("attribute " + match.ref.split("/")[0] + " minecraft:generic.max_health base set 200");
    stage.command("data merge entity " + match.ref.split("/")[0] + " {Health:200.0f}");
    stage.hostile(caster, match);
    stage.hostile(caster, mismatch);
    stage.until(1200, function () {
        return stage.casts("synchronoise", caster) >= 1 && stage.damageTo(match) > 0;
    }, function () {
        // 等效果事件的下一步（mob_effect_added 在效果挂上后的下一个 tick 触发）再核对记号。
        stage.after(5, function () {
            stage.expect(stage.casts("synchronoise", caster) >= 1, "banette committed synchronoise");
            stage.expect(stage.damageTo(match) > 0, "the matching undead foe took resonance damage");
            stage.expect(stage.hasMobEffect(match, "world_combat:status/resonance")
                && stage.hadMobEffect(match, "world_combat:status/resonance"), "the matching undead foe was locked with the resonance identity");
            stage.expect(stage.damageTo(mismatch) <= 0, "the unmatched animal took no damage from the wave");
            stage.expect(stage.hasMobEffect(match, "minecraft:glowing"), "resonance outlines the ordinary matching target");
            stage.note("crit, how many same-type foes stood inside the ring and the echo span are random/positional", {
                casts: stage.casts("synchronoise", caster),
                matchDamage: Math.round(stage.damageTo(match) * 10) / 10,
                mismatchDamage: Math.round(stage.damageTo(mismatch) * 10) / 10,
                matchAlive: match.alive(),
                mismatchAlive: mismatch.alive()
            });
            stage.done();
        });
    }, "synchronoise resonates a same-type foe within 60 s");
});
