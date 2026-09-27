// Actual cast followed by native dispel: the finite state must own its stat contribution.
Smoke.scenario("flash", function (stage) {
    stage.time("midnight");
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    const caster = stage.pokemon({ species: "magnemite", level: 50, moves: ["flash"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.noai(foe);
    stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.max_health base set 10000");
    stage.command("data merge entity " + foe.ref.split("/")[0] + " {Health:10000.0f}");
    const affected = foe, baseline = 1;
    stage.boost(affected, { accuracy: baseline });
    stage.after(2, function () { stage.prefer(caster, "flash", { ai: { dense: 1 } }); });
    let seeking = true;
    function keepThreat(): void {
        if (!seeking) return;
        stage.provoke(caster, foe);
        stage.after(60, keepThreat);
    }
    keepThreat();
    stage.until(2400, function () {
        return stage.casts("flash", caster) > 0 && stage.hasMobEffect(affected, "world_combat:flash_dazzled")
            && (stage.stages(affected)["accuracy"] || 0) < baseline;
    }, function () {
        stage.expect(stage.hasMobEffect(affected, "world_combat:flash_dazzled"), "real cast applied its finite carrier");
        stage.expect((stage.stages(affected)["accuracy"] || 0) < baseline, "carrier has a real stage contribution");

        seeking = false;
        stage.setPp(caster, "flash", 0);
        stage.command("effect clear " + affected.ref.split("/")[0] + " world_combat:flash_dazzled");
        stage.until(10, function () {
            return !stage.hasMobEffect(affected, "world_combat:flash_dazzled") && (stage.stages(affected)["accuracy"] || 0) === baseline;
        }, function () {
            stage.expect((stage.stages(affected)["accuracy"] || 0) === baseline, "native dispel restores only this move, preserving the unrelated stage");
            stage.note("Native dispel verified after actual skill application; visual timing remains a manual check.", { casts: stage.casts("flash", caster), baseline: baseline, remaining: stage.stages(affected)["accuracy"] || 0 });
            stage.done();
        }, "finite contribution ends with its carrier");
    }, "actual skill applies finite stage change");
});
