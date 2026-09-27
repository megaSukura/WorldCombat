// 超音波的可执行设计说明：让一只宝可梦对着近处的敌人只发这一声，声浪从自己身上扫出去。
// 必然事实：超音波被放出来过；与施法者同层、且在声浪半径内的目标带上了共享混乱身份；
// 高处平台上的目标与远超射程外的目标都不会被扫到（薄波前 + 高度带 + reach 夹取）。
// 出手作废与反噬是随机结果，写进 note。
Smoke.scenario("supersonic", function (stage) {
    var caster = stage.pokemon({ species: "zubat", level: 32, moves: ["supersonic"], at: [-3, 0, 0] });
    // 原版生物也会被声浪扫中并带上同一份共享身份；僵尸的近战会触发混乱反噬。
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    // 高处一层：抬高到声浪高度带之外，整段交战都不该被扫到。
    stage.fill([2, 6, -1], [4, 6, 1], "minecraft:stone");
    var raised = stage.mob({ type: "minecraft:zombie", at: [3, 7, 0] });
    // 射程之外：冻结它，保证不会走进波前。
    var far = stage.mob({ type: "minecraft:zombie", at: [18, 0, 0] });
    stage.noai(raised, far);
    stage.until(900, function () {
        return stage.casts("supersonic", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/confusion");
    }, function () {
        // 等声浪走完整段射程，再读两个不该被扫到的目标。
        stage.after(60, function () {
            stage.expect(stage.casts("supersonic", caster) > 0, "supersonic was cast");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/confusion"), "the same-level target carried the shared confusion identity");
            stage.expect(!stage.hadMobEffect(raised, "world_combat:status/confusion"), "the raised target above the band was never swept");
            stage.expect(!stage.hadMobEffect(far, "world_combat:status/confusion"), "the target past the reach was never swept");
            stage.note("薄波前只扫过与施法者同高的一层：同层近敌挂上共享混乱，高处平台与超出射程的目标整段都没被扫到；出手作废与打中自伤是随机结果。", {
                casts: stage.casts("supersonic", caster), casterHp: caster.health(), targetHp: target.health(),
                raisedHp: raised.health(), farHp: far.health()
            });
            stage.done();
        });
    }, "supersonic sweeps the target");
});
