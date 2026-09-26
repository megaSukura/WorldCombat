// 金属音的可执行设计说明：一只只会金属音的 Magnemite 对一个没有特防概念的原版生物慢慢磨音。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/grating；目标共享阶梯里的特防被刮低至少一级。
// 原版生物没有 armor 通道，特防落在世界共享的 spd 阶梯上；目标冻在原地好让各段刮擦都在射程内完成。
// 回响持续多久、一共刮了几级、掩体是否参与都写进 note。
Smoke.scenario("metalsound", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["metalsound"], at: [0, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.noai(target);
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("metalsound", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/grating")
            && (stage.stages(target).spd || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("metalsound", caster) > 0, "metalsound was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/grating"), "the target carried the shared grating identity");
        stage.expect((stage.stages(target).spd || 0) <= -2, "the staged scrapes dropped the shared Sp. Def two steps");
        stage.note("metalsound landed; the resonance window, cover and how many scrapes completed are not part of this run", {
            casts: stage.casts("metalsound", caster), stages: stage.stages(target),
            casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "metalsound grates on the target");
});
