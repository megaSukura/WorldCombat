// 天使之吻的可执行设计说明：贴合招，让施法者对着近处的敌人只说这一句话，先走到几乎贴上脸才出手。
// 必然事实：天使之吻被放出来过，且被亲到的目标带上了共享混乱身份。
// 出手作废、反噬与贴触成败都是随机/位置结果，写进 note。
Smoke.scenario("sweetkiss", function (stage) {
    var caster = stage.pokemon({ species: "jigglypuff", level: 30, moves: ["sweetkiss"], at: [-2, 0, 0] });
    // 原版生物也能被亲到并带上同一份共享身份；僵尸的近战会触发混乱反噬。
    var target = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("sweetkiss", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/confusion");
    }, function () {
        stage.expect(stage.casts("sweetkiss", caster) > 0, "sweetkiss was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confusion"), "target carried the shared confusion identity");
        stage.note("天使之吻必须先走到几乎贴上身体、且第一个身体就是目标才生效；隔墙、被第三方挡住或没贴上都不施混乱，也不报成功。亲密度决定混乱时长，出手作废与反噬是随机结果。", {
            casts: stage.casts("sweetkiss", caster), casterHp: caster.health(), targetHp: target.health(),
            travelled: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "sweetkiss lands on the target");
});
