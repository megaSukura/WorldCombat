/**
 * 神奇蒸汽 的可执行设计说明：让会这一招的仙系精灵朝一名对手所在的落点喷出一柱蒸汽，验证蒸汽云被放下、首次命中造成伤害。
 * 迷幻（基础 20% 起）、续熏与云停留时长都是随机或时间结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("strangesteam", function (stage) {
    var gardevoir = stage.pokemon({ species: "gardevoir", level: 36, moves: ["strangesteam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(gardevoir, machop);
    stage.until(900, function () { return stage.casts("strangesteam", gardevoir) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("strangesteam", gardevoir) > 0, "蒸汽云被喷出来了");
        stage.expect(stage.damageTo(machop) > 0, "被云罩到的目标挨了首喷伤害");
        stage.note("迷幻（基础 20% 起）、云内续熏、浓雾/喷发模式与云停留都是随机或时间结果，只作记录。",
            { casts: stage.casts("strangesteam", gardevoir), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              hazed: stage.hasMobEffect(machop, "world_combat:status/confusion") });
        stage.done();
    }, "蒸汽云首次命中");
});
