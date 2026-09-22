/**
 * 暗影球的可执行设计说明：让会这一招的精灵对一名宝可梦掷出影球，验证它命中、造成伤害。
 * 碾防（约 20% 基础概率）是随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("shadowball", function (stage) {
    var gastly = stage.pokemon({ species: "gastly", level: 32, moves: ["shadowball"], at: [-7, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(gastly, machop);
    stage.until(900, function () { return stage.casts("shadowball", gastly) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("shadowball", gastly) > 0, "暗影球被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "影球打到了目标身上");
        stage.note("影球命中与碾防（约 20% 基础）是随机结果，只作记录；飞行速度与射程由速度与特攻决定。",
            { casts: stage.casts("shadowball", gastly), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "影球命中目标");
});
