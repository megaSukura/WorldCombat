/**
 * 琉光冲激的可执行设计说明：让会这一招的精灵朝一名对手引下一道怪光柱，验证它命中、造成伤害。
 * 特防 −2（必中）、坠落期间是否被走掉、炸落是否卷到旁人都是固定/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("luminacrash", function (stage) {
    var gothita = stage.pokemon({ species: "gothita", level: 38, moves: ["luminacrash"], at: [-7, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(gothita, machop);
    stage.until(900, function () { return stage.casts("luminacrash", gothita) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("luminacrash", gothita) > 0, "琉光冲激被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "怪光柱砸到了目标身上");
        stage.note("特防下降 2 级（直击必中）与坠落期间目标是否走出逃逸距离、炸落是否卷到旁人，都是固定/位置结果，只作记录。",
            { casts: stage.casts("luminacrash", gothita), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "怪光柱砸到目标");
});
