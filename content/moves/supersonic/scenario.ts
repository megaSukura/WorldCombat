// 超音波的可执行设计说明：让一只宝可梦对着近处的敌人只发这一声，声浪从自己身上扫出去。
// 必然事实：超音波被放出来过，且被波前扫到的目标带上了共享混乱身份。
// 出手作废与反噬是随机结果，写进 note。
Smoke.scenario("supersonic", function (stage) {
    var caster = stage.pokemon({ species: "zubat", level: 32, moves: ["supersonic"], at: [-3, 0, 0] });
    // 原版生物也会被声浪扫中并带上同一份共享身份；僵尸的近战会触发混乱反噬。
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("supersonic", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/confusion");
    }, function () {
        stage.expect(stage.casts("supersonic", caster) > 0, "supersonic was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confusion"), "target carried the shared confusion identity");
        stage.note("声浪以自身为心向外扩散，扫到的目标挂上共享混乱；之后出手作废与打中自伤是随机结果。", {
            casts: stage.casts("supersonic", caster), casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "supersonic sweeps the target");
});
