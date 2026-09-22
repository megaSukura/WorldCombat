// 影子分身的可执行设计说明：让一只速度型宝可梦对着近处的敌人只留影，被威胁时才出手。
// 必然事实：影子分身被放出来过，且施法者自己带上了共享残影身份。
// 残影是否真的挡下伤害、磨穿时机是随机结果，写进 note。
Smoke.scenario("doubleteam", function (stage) {
    var caster = stage.pokemon({ species: "electrode", level: 40, moves: ["doubleteam"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "magikarp", level: 20, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("doubleteam", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/doubleteam");
    }, function () {
        stage.expect(stage.casts("doubleteam", caster) > 0, "doubleteam was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/doubleteam"), "caster carried the shared doubleteam identity");
        stage.note("留影后残影替本体承伤，磨穿即散；有多少伤害被挡下是随机结果。", {
            casts: stage.casts("doubleteam", caster), casterHp: caster.health(), damageTaken: stage.damageTo(caster)
        });
        stage.done();
    }, "doubleteam leaves mirrors");
});
