Smoke.scenario("synchronoise", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "banette", level: 40, moves: ["synchronoise"], at: [0, 0, 0] });
    var match = stage.mob({ type: "minecraft:zombified_piglin", at: [3, 0, 0] });
    var foreign = stage.mob({ type: "minecraft:zombified_piglin", at: [3, 0, -1.8] });
    var mismatch = stage.mob({ type: "minecraft:cow", at: [3, 0, 1.8] });
    stage.noai(match, foreign, mismatch);
    stage.command("attribute " + match.ref.split("/")[0] + " minecraft:generic.max_health base set 200");
    stage.command("data merge entity " + match.ref.split("/")[0] + " {Health:200.0f}");
    stage.command("attribute " + foreign.ref.split("/")[0] + " minecraft:generic.max_health base set 200");
    stage.command("data merge entity " + foreign.ref.split("/")[0] + " {Health:200.0f}");
    // 另一只同频目标身上先挂一段很长的外来发光：本招结束时不得把它缩短或清掉。
    stage.command("effect give " + foreign.ref.split("/")[0] + " minecraft:glowing 999 0");
    stage.hostile(caster, match);
    stage.hostile(caster, foreign);
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
            stage.expect(!stage.hasMobEffect(mismatch, "minecraft:glowing"), "the unmatched animal is not outlined");
            // 跨过动作结束：清除记号，显形与它租下的发光应一起收走（只撤自己那一次来源，别人的发光留着）。
            stage.command("effect clear " + match.ref.split("/")[0] + " world_combat:resonance");
            stage.command("effect clear " + foreign.ref.split("/")[0] + " world_combat:resonance");
            stage.after(6, function () {
                stage.expect(!stage.hasMobEffect(match, "world_combat:status/resonance"), "clearing the carrier clears the resonance identity");
                stage.expect(!stage.hasMobEffect(match, "minecraft:glowing"), "the reveal outline is withdrawn with its own resonance");
                stage.expect(stage.hasMobEffect(foreign, "minecraft:glowing"), "a longer foreign outline is not removed by our reveal");
                stage.note("crit, how many same-type foes stood inside the ring and the echo span are random/positional", {
                    casts: stage.casts("synchronoise", caster),
                    matchDamage: Math.round(stage.damageTo(match) * 10) / 10,
                    foreignDamage: Math.round(stage.damageTo(foreign) * 10) / 10,
                    mismatchDamage: Math.round(stage.damageTo(mismatch) * 10) / 10,
                    matchAlive: match.alive(),
                    foreignAlive: foreign.alive(),
                    mismatchAlive: mismatch.alive()
                });
                stage.done();
            });
        });
    }, "synchronoise resonates a same-type foe within 60 s");
});
