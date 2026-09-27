// Actual cast followed by native dispel: the finite state must own its stat contribution.
Smoke.scenario("workup", function (stage) {
    stage.time("midnight");
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    const caster = stage.pokemon({ species: "riolu", level: 50, moves: ["workup"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.noai(foe);
    stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.max_health base set 10000");
    stage.command("data merge entity " + foe.ref.split("/")[0] + " {Health:10000.0f}");
    const affected = caster;
    let baseline = 0;

    let seeking = true;
    function keepThreat(): void {
        if (!seeking) return;
        stage.provoke(caster, foe);
        stage.after(60, keepThreat);
    }
    stage.after(6, keepThreat);
    stage.until(2400, function () {
        return stage.casts("workup", caster) > 0 && stage.hasMobEffect(affected, "world_combat:roused")
            && (stage.stages(affected)["atk"] || 0) > baseline;
    }, function () {
        stage.expect(stage.hasMobEffect(affected, "world_combat:roused"), "real cast applied its finite carrier");
        stage.expect((stage.stages(affected)["atk"] || 0) > baseline, "carrier has a real stage contribution");

        stage.boost(affected, { atk: 1 });
        baseline = 1;
        stage.expect((stage.stages(affected).atk || 0) >= 2, "unrelated attack stage added alongside the live Work Up boost");
        seeking = false;
        stage.setPp(caster, "workup", 0);
        stage.command("effect clear " + affected.ref.split("/")[0] + " world_combat:roused");
        stage.until(10, function () {
            return !stage.hasMobEffect(affected, "world_combat:roused") && (stage.stages(affected)["atk"] || 0) === baseline;
        }, function () {
            stage.expect((stage.stages(affected)["atk"] || 0) === baseline, "native dispel restores only this move, preserving the unrelated stage");
            stage.note("Native dispel verified after actual skill application; visual timing remains a manual check.", { casts: stage.casts("workup", caster), baseline: baseline, remaining: stage.stages(affected)["atk"] || 0 });
            stage.done();
        }, "finite contribution ends with its carrier");
    }, "actual skill applies finite stage change");
});
