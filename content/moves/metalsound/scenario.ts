// 金属音的可执行设计说明：一只只会金属音的 Magnemite 对一个没有特防概念的原版生物慢慢磨音。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/grating；目标的护甲随特防一起走低。
// 回响持续多久、掩体是否参与、掉 2 级还是 3 级都不是本场景的必然事实，写进 note。
Smoke.scenario("metalsound", function (stage) {
    var caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["metalsound"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    var armor = stage.attribute(target, "minecraft:generic.armor");
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("metalsound", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/grating")
            && stage.attribute(target, "minecraft:generic.armor") < armor - 0.001;
    }, function () {
        stage.expect(stage.casts("metalsound", caster) > 0, "metalsound was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/grating"), "the target carried the shared grating identity");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < armor - 0.001,
            "the target's armour fell with the Sp. Def drop");
        stage.note("metalsound landed; the resonance window, cover and the exact stage drop are not part of this run", {
            casts: stage.casts("metalsound", caster), armor: [armor, stage.attribute(target, "minecraft:generic.armor")],
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "metalsound grates on the target");
});
