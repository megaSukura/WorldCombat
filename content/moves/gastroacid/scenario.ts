/** 普通MC生物：胃液命中后确实蚀薄护甲并造成酸蚀，状态图标与行为同时存在。 */
Smoke.scenario("gastroacid", function (stage) {
    stage.time("night");
    const caster = stage.pokemon({ species: "arbok", level: 42, moves: ["gastroacid"], at: [-3, 0, 0] });
    const target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.noai(target);
    const armor = stage.attribute(target, "minecraft:generic.armor");
    stage.provoke(caster, target);
    stage.until(900, function () { return stage.hasMobEffect(target, "world_combat:gastroacid"); }, function () {
        stage.expect(stage.casts("gastroacid", caster) > 0, "gastroacid committed against an ordinary mob");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < armor, "acid reduced the ordinary mob's armor");
        stage.until(80, function () { return stage.damageTo(target) > 0; }, function () {
            stage.expect(stage.damageTo(target) > 0, "native acid damage occurred while coated");
            stage.note("The ordinary target has no Pokemon ability: its existing armor and native health are affected instead.", { armorBefore: armor, armorAfter: stage.attribute(target, "minecraft:generic.armor"), damage: stage.damageTo(target) });
            stage.done();
        }, "acid tick damaged the target");
    }, "ordinary target was coated");
});
