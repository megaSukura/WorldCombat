/**
 * 嬉闹的可执行设计说明：让会这一招的布鲁朝一名格斗系目标滚过去，验证扑撞命中、造成伤害。
 * 顶开、撒欢式的第二次翻滚、以及降攻（基础 10% 起）分别依赖位置与随机，写进 note 供读轨迹判断。
 */
Smoke.scenario("playrough", function (stage) {
    var snubbull = stage.pokemon({ species: "snubbull", level: 30, moves: ["playrough"], at: [-3, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 25, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(snubbull, machop);
    stage.until(900, function () { return stage.casts("playrough", snubbull) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("playrough", snubbull) > 0, "嬉闹被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "扑撞打到了目标身上");
        stage.note("顶开距离、撒欢式的第二次翻滚（需要 bounceRange 内还有另一个敌人），以及降攻（基础 10% 起）都是位置／随机结果，只作记录。",
            { casts: stage.casts("playrough", snubbull), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              moved: Math.round(stage.travelled(snubbull) * 10) / 10 });
        stage.done();
    }, "扑撞命中目标");
});
