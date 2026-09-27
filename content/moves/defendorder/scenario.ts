/**
 * Verify the living-shell design: underlings must actually cling close and in sight before their stage is granted on
 * top of an existing +5/+5 ladder, every underling lost withdraws its stage at the moment it ends (not on the next
 * 20-tick sweep), and losing the last one ends the shell carrier, freeing a recast.
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
        const raised = stage.stages(caster);
        return stage.casts("defendorder", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/defendorder")
            && raised.def === 6 && raised.spd === 6;
    }, function () {
        stage.expect(stage.casts("defendorder", caster) > 0, "defend order was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/defendorder"), "the shell window carried the shared identity");
        const raised = stage.stages(caster);
        // 只有真正飞到身边、有通视的手下才供给：等级在手下到达后才抬到封顶的 +6。
        stage.expect(raised.def === 6 && raised.spd === 6, "underlings that clung close and in sight raised both defenses to the +6 cap");
        // 阻止重召，再打掉全部手下：等级随每只结束当刻收回，最后一只失去即结束载体。
        stage.setPp(caster, "defendorder", 0);
        stage.command("kill @e[type=world_combat_core:body]");
        stage.until(120, function () {
            return !stage.hasMobEffect(caster, "world_combat:defendorder_guard");
        }, function () {
            const empty = stage.stages(caster);
            stage.expect(empty.def === 5 && empty.spd === 5, "losing every underling withdraws the whole window at once");
            stage.expect(!stage.hasMobEffect(caster, "world_combat:defendorder_guard"), "the last underling lost ends the shell carrier, so the cooldown alone gates a recast");
            stage.note("The owned contribution capped at +6 only after underlings clung close and visible, each underling end withdrew its stage at once, and losing the last one ended the shell carrier (freeing a recast). A walled-off underling grants nothing.", { raised: raised, afterBodiesGone: empty });
            stage.done();
        }, "the shell ends after the last underling");
    }, "defend order engages and underlings cling");
});
