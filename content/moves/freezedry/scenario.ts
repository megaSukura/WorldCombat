// 冷冻干燥的可执行设计说明：一只只会冷冻干燥的冰系宝可梦隔空打一只纯水属性的目标。
// 必然事实：本招被提交过；目标受到过伤害（水属性会拿到 2 倍相性，但伤害本身必然发生）。
// 冰冻是否触发（概率）、水相性是否翻倍、命中率写进 note 供读轨迹判断。
Smoke.scenario("freezedry", function (stage) {
    var caster = stage.pokemon({ species: "glalie", level: 40, moves: ["freezedry"], at: [-9, 0, 0] });
    var target = stage.pokemon({ species: "wailmer", level: 35, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("freezedry") > 0 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("freezedry") > 0, "freezedry was committed");
        stage.expect(stage.damageTo(target) > 0, "freezedry dealt damage");
        stage.note("freezedry shot", {
            casts: stage.casts("freezedry"),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            frozen: stage.hadMobEffect(target, "world_combat:status/frozen"),
            targetHealth: target.health(),
            movedCaster: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "freezedry lands");
});
