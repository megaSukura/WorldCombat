// Actual cast followed by native dispel: the finite state must own its stat contribution.
Smoke.scenario("liquidation", function (stage) {
    stage.time("midnight");
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    const caster = stage.pokemon({ species: "gyarados", level: 50, moves: ["liquidation"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.noai(foe);
    stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.max_health base set 10000");
    stage.command("data merge entity " + foe.ref.split("/")[0] + " {Health:10000.0f}");
    const affected = foe, baseline = 1;
    stage.boost(affected, { def: baseline });
    let seeking = true;
    function keepThreat(): void {
        if (!seeking) return;
        stage.provoke(caster, foe);
        stage.after(60, keepThreat);
    }
    keepThreat();
    stage.until(2400, function () {
        return stage.casts("liquidation", caster) > 0 && stage.hasMobEffect(affected, "world_combat:liquidation_sundered")
            && (stage.stages(affected)["def"] || 0) < baseline;
    }, function () {
        stage.expect(stage.hasMobEffect(affected, "world_combat:liquidation_sundered"), "real cast applied its finite carrier");
        stage.expect((stage.stages(affected)["def"] || 0) < baseline, "carrier has a real stage contribution");
        stage.expect(stage.damageTo(foe) > 0, "the move also dealt its contact or projectile damage");
        seeking = false;
        stage.setPp(caster, "liquidation", 0);
        stage.command("effect clear " + affected.ref.split("/")[0] + " world_combat:liquidation_sundered");
        stage.until(10, function () {
            return !stage.hasMobEffect(affected, "world_combat:liquidation_sundered") && (stage.stages(affected)["def"] || 0) === baseline;
        }, function () {
            stage.expect((stage.stages(affected)["def"] || 0) === baseline, "native dispel restores only this move, preserving the unrelated stage");
            stage.note("Native dispel verified after actual skill application; visual timing remains a manual check.", { casts: stage.casts("liquidation", caster), baseline: baseline, remaining: stage.stages(affected)["def"] || 0 });
            stage.done();
        }, "finite contribution ends with its carrier");
    }, "actual skill applies finite stage change");
});
