/**
 * 念力的可执行设计说明：让会这一招的凯西朝一名格斗系对手弹一发念弹，验证念弹命中、造成伤害。
 * 恍惚（基础 10% 起）与「被打散时再敲一下」是随机结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("confusion", function (stage) {
    var abra = stage.pokemon({ species: "abra", level: 30, moves: ["confusion"], at: [-4, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 24, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(abra, machop);
    stage.until(900, function () { return stage.casts("confusion", abra) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("confusion", abra) > 0, "念弹被弹出来了");
        stage.expect(stage.damageTo(machop) > 0, "念弹打到了目标身上");
        stage.note("恍惚（基础 10% 起，特攻与等级提高）、以及恍惚期间出手被打散时的再敲一下，都是随机结果，只作记录。",
            { casts: stage.casts("confusion", abra), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              dazed: stage.hasMobEffect(machop, "world_combat:status/confusion") });
        stage.done();
    }, "念弹命中目标");
});
