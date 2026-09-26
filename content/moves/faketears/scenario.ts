// 假哭的可执行设计说明：一只只会假哭的 Eevee 贴着一个没有特防概念的原版生物装哭。
// 必然事实：本招被提交过；目标带上共享身份 world_combat:status/flustered；目标共享阶梯里的特防下降。
// 原版生物没有 armor 通道，特防落在世界共享的 spd 阶梯上；目标不因此被定住、假泪掉落时视线是否被挡，写进 note。
Smoke.scenario("faketears", function (stage) {
    stage.time("midnight");
    var caster = stage.pokemon({ species: "eevee", level: 35, moves: ["faketears"], at: [-1, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("faketears", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/flustered")
            && (stage.stages(target).spd || 0) <= -2;
    }, function () {
        stage.expect(stage.casts("faketears", caster) > 0, "faketears was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/flustered"), "the target carried the shared flustered identity");
        stage.expect((stage.stages(target).spd || 0) <= -2, "the target's shared Sp. Def stage fell by the base amount");
        stage.note("faketears landed; the target was not pinned and whether sight was ever blocked are not part of this run", {
            casts: stage.casts("faketears", caster), stages: stage.stages(target),
            casterHp: caster.health(), targetHp: target.health(),
            targetMoved: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "faketears flusters the target");
});
