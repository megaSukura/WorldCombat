// 假哭的可执行设计说明：一只只会假哭的 Eevee 贴着一个没有特防概念的原版生物装哭。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/flustered；目标的护甲随特防一起走低。
// 「不知所措」定住了目标多久、假泪掉落时视线是否被挡，都不是本场景的必然事实，写进 note。
Smoke.scenario("faketears", function (stage) {
    var caster = stage.pokemon({ species: "eevee", level: 35, moves: ["faketears"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var armor = stage.attribute(target, "minecraft:generic.armor");
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("faketears", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/flustered")
            && stage.attribute(target, "minecraft:generic.armor") < armor - 0.001;
    }, function () {
        stage.expect(stage.casts("faketears", caster) > 0, "faketears was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/flustered"), "the target carried the shared flustered identity");
        stage.expect(stage.attribute(target, "minecraft:generic.armor") < armor - 0.001,
            "the target's armour fell with the Sp. Def drop");
        stage.note("faketears landed; how long the hesitation pinned the target and whether sight was ever blocked are not part of this run", {
            casts: stage.casts("faketears", caster), armor: [armor, stage.attribute(target, "minecraft:generic.armor")],
            casterHp: caster.health(), targetHp: target.health(),
            targetMoved: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "faketears flusters the target");
});
