/**
 * 洁净光芒的可执行设计说明：让会这一招的精灵贴近一名格斗系对手，放出一圈强光，验证它命中、造成伤害。
 * 碾防（约 50% 基础概率）与逐圈扫过是随机/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("lusterpurge", function (stage) {
    var latios = stage.pokemon({ species: "latios", level: 40, moves: ["lusterpurge"], at: [-2.5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(latios, machop);
    stage.until(900, function () { return stage.casts("lusterpurge", latios) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("lusterpurge", latios) > 0, "洁净光芒被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "光幕照到了目标身上");
        stage.note("碾防（约 50% 基础）与逐圈扫过是随机/位置结果，只作记录；这是以自身为中心的短射程爆发。",
            { casts: stage.casts("lusterpurge", latios), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "光幕照到目标");
});
