// Actual cast followed by natural expiration: the finite state must own its stat contribution.
Smoke.scenario("muddywater", function (stage) {
    stage.time("midnight");
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    const caster = stage.pokemon({ species: "swampert", level: 50, moves: ["muddywater"], at: [0, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.noai(foe);
    stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.max_health base set 10000");
    stage.command("data merge entity " + foe.ref.split("/")[0] + " {Health:10000.0f}");
    const affected = foe, baseline = 0;

    let seeking = true;
    function keepThreat(): void {
        if (!seeking) return;
        stage.provoke(caster, foe);
        stage.after(60, keepThreat);
    }
    keepThreat();
    stage.until(2400, function () {
        return stage.casts("muddywater", caster) > 0 && stage.hasMobEffect(affected, "world_combat:muddywater_murk")
            && (stage.stages(affected)["accuracy"] || 0) < baseline;
    }, function () {
        stage.expect(stage.hasMobEffect(affected, "world_combat:muddywater_murk"), "real cast applied its finite carrier");
        stage.expect((stage.stages(affected)["accuracy"] || 0) < baseline, "carrier has a real stage contribution");
        stage.expect(stage.damageTo(foe) > 0, "the move also dealt its contact or projectile damage");
        seeking = false;
        stage.setPp(caster, "muddywater", 0);

        stage.until(800, function () {
            return !stage.hasMobEffect(affected, "world_combat:muddywater_murk") && (stage.stages(affected)["accuracy"] || 0) === baseline;
        }, function () {
            stage.expect((stage.stages(affected)["accuracy"] || 0) === baseline, "expiry restores its stage contribution");
            stage.note("Natural expiry verified after actual skill application; visual timing remains a manual check.", { casts: stage.casts("muddywater", caster), baseline: baseline, remaining: stage.stages(affected)["accuracy"] || 0 });
            stage.done();
        }, "finite contribution ends with its carrier");
    }, "actual skill applies finite stage change");
});
