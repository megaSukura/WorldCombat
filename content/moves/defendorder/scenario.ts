/**
 * Verify the live-shell design: the owned window caps on top of an existing +5/+5 ladder, every underling lost
 * withdraws its stage at the moment it ends (not on the next 20-tick sweep), and removing the carrier keeps only
 * the prior +5/+5 contribution.
 */
Smoke.scenario("defendorder", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "vespiquen", level: 30, moves: ["defendorder"], at: [-3, 0, 0], properties: "gender=female" });
    var foe = stage.pokemon({ species: "rattata", level: 10, moves: ["tackle"], at: [5, 0, 0] });
    stage.after(2, function () {
        stage.boost(caster, { def: 5, spd: 5 });
        const prepared = stage.stages(caster);
        stage.expect(prepared.def === 5 && prepared.spd === 5, "the initial +5/+5 ladder is installed after actor binding");
    });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("defendorder", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/defendorder");
    }, function () {
        stage.expect(stage.casts("defendorder", caster) > 0, "defend order was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/defendorder"), "the shell window carried the shared identity");
        const raised = stage.stages(caster);
        stage.expect(raised.def === 6 && raised.spd === 6, "owned shell window caps on top of the existing +5 stages");
        // 阻止重召，再打掉全部手下：等级应当随每只结束当刻收回，而不是等 20 刻补扫。
        stage.setPp(caster, "defendorder", 0);
        stage.command("kill @e[type=world_combat_core:body]");
        stage.after(4, function () {
            const empty = stage.stages(caster);
            stage.expect(empty.def === 5 && empty.spd === 5, "losing every underling withdraws the whole window at once");
            stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:defendorder_guard");
            stage.after(3, function () {
                const remaining = stage.stages(caster);
                stage.expect(!stage.hasMobEffect(caster, "world_combat:defendorder_guard"), "cleared shell carrier is gone");
                stage.expect(remaining.def === 5 && remaining.spd === 5, "shell removal preserves the prior +5/+5 contribution");
                stage.note("The owned contribution capped at +6 while active, each underling end withdrew its stage at once, and carrier removal took back only the shell's own window.", { raised: raised, afterBodiesGone: empty, afterCarrierCleared: remaining });
                stage.done();
            });
        });
    }, "defend order engages");
});
