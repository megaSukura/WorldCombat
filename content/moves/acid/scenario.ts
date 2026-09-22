/**
 * 溶解液的可执行设计说明：让会这一招的精灵朝一名对手泼出一团酸，验证它命中、造成伤害。
 * 酸池每跳伤害、碾防（约 10% 基础概率）是位置/随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("acid", function (stage) {
    var oddish = stage.pokemon({ species: "oddish", level: 32, moves: ["acid"], at: [-6, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(oddish, machop);
    stage.until(900, function () { return stage.casts("acid", oddish) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("acid", oddish) > 0, "溶解液被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "酸泼到了目标身上");
        stage.note("酸池每跳伤害、碾防（约 10% 基础）与落点覆盖是位置/随机结果，只作记录；酸池是留在世界里的场地效果。",
            { casts: stage.casts("acid", oddish), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "酸泼到目标");
});
