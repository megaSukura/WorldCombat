// 天使之吻的可执行设计说明：近身招，让施法者对着近处的敌人只说这一句话，靠走位贴身才能亲到。
// 必然事实：天使之吻被放出来过，且被亲到的目标带上了共享混乱身份。
// 出手作废与反噬是随机结果，写进 note。
Smoke.scenario("sweetkiss", function (stage) {
    var caster = stage.pokemon({ species: "jigglypuff", level: 30, moves: ["sweetkiss"], at: [-3, 0, 0] });
    // 原版生物也能被亲到并带上同一份共享身份；僵尸的近战会触发混乱反噬。
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("sweetkiss", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/confusion");
    }, function () {
        stage.expect(stage.casts("sweetkiss", caster) > 0, "sweetkiss was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confusion"), "target carried the shared confusion identity");
        stage.note("天使之吻必须先贴身到亲吻距离才生效；亲密度决定混乱时长。走位决定成败。", {
            casts: stage.casts("sweetkiss", caster), casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "sweetkiss lands on the target");
});
