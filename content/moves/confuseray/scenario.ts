// 奇异之光的可执行设计说明：让一只高特攻的宝可梦对着远处的敌人只放这一束光。
// 必然事实：奇异之光被放出来过，且被照到的目标带上了共享混乱身份。
// 出手作废与反噬是随机结果，写进 note。
Smoke.scenario("confuseray", function (stage) {
    var caster = stage.pokemon({ species: "gengar", level: 40, moves: ["confuseray"], at: [-6, 0, 0] });
    // 原版生物也能被这束光照中并带上同一份共享身份；僵尸的近战会触发混乱反噬。
    var target = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("confuseray", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/confusion");
    }, function () {
        stage.expect(stage.casts("confuseray", caster) > 0, "confuseray was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/confusion"), "target carried the shared confusion identity");
        stage.note("幽光沿直线命中并挂上共享混乱；之后目标出手作废与打中自伤是随机结果。", {
            casts: stage.casts("confuseray", caster), casterHp: caster.health(), targetHp: target.health()
        });
        stage.done();
    }, "confuseray lands on the target");
});
