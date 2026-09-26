/**
 * 神奇蒸汽 的可执行设计说明：让会这一招的仙系精灵朝一名对手所在的落点喷出一柱蒸汽，验证蒸汽云被放下、首次命中造成伤害，
 * 且首喷之后不会在下一 scan 立刻追加续熏（节拍从首喷起算，至少 2 秒内保持一次伤害）。
 * 迷幻（基础 20% 起）、续熏节奏、浓雾/喷发模式与云停留都是随机或时间结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("strangesteam", function (stage) {
    var gardevoir = stage.pokemon({ species: "gardevoir", level: 36, moves: ["strangesteam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(gardevoir, machop);
    stage.until(900, function () { return stage.casts("strangesteam", gardevoir) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("strangesteam", gardevoir) > 0, "蒸汽云被喷出来了");
        stage.expect(stage.damageTo(machop) > 0, "被云罩到的目标挨了首喷伤害");
        var first = stage.damageTo(machop);
        stage.after(40, function () {
            stage.expect(stage.damageTo(machop) <= first + 0.001, "首喷后至少 2 秒内不会立刻追加续熏（节拍从首喷起算）");
            stage.note("迷幻（基础 20% 起）、云内续熏节拍、浓雾/喷发模式与云停留都是随机或时间结果，只作记录。",
                { casts: stage.casts("strangesteam", gardevoir), firstSpray: Math.round(first * 10) / 10,
                  afterWait: Math.round(stage.damageTo(machop) * 10) / 10,
                  hazed: stage.hasMobEffect(machop, "world_combat:status/confusion") });
            stage.done();
        });
    }, "蒸汽云首次命中");
});
