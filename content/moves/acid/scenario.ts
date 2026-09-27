/**
 * 溶解液的可执行设计说明：让会这一招的精灵朝一名对手泼出一团酸，验证它命中、造成伤害，
 * 并且落点周围可达的另一名敌人也被同一发溅到（直击与泼溅都会结算）。
 * 弹道落点、酸池每跳、碾防（约 10% 基础概率）与是否被墙挡住是位置/随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("acid", function (stage) {
    var oddish = stage.pokemon({ species: "oddish", level: 32, moves: ["acid"], at: [-6, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    var buddy = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [1.2, 0, 0] });
    stage.hostile(oddish, machop);
    stage.hostile(oddish, buddy);
    stage.until(1200, function () {
        return stage.casts("acid", oddish) > 0 && stage.damageTo(machop) > 0 && stage.damageTo(buddy) > 0;
    }, function () {
        stage.expect(stage.casts("acid", oddish) > 0, "溶解液被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "酸泼到了目标身上");
        stage.expect(stage.damageTo(buddy) > 0, "落点旁边的另一名敌人也被同一发溅到");
        stage.note("弹道落点、酸池每跳伤害、碾防（约 10% 基础）与是否被墙挡住都是位置/随机结果，只作记录；酸池是留在世界里的场地效果。",
            { casts: stage.casts("acid", oddish), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              splash: Math.round(stage.damageTo(buddy) * 10) / 10,
              changed: stage.changedBlocks().length });
        stage.done();
    }, "酸泼到目标与旁边的敌人");
});
