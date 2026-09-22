/**
 * 虫鸣的可执行设计说明：让会这一招的精灵朝一名超能力系对手鸣一声，验证声波命中、造成伤害。
 * 碾防（约 10% 基础概率）与远端衰减是随机/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("bugbuzz", function (stage) {
    var yanma = stage.pokemon({ species: "yanma", level: 34, moves: ["bugbuzz"], at: [-4, 0, 0] });
    var abra = stage.pokemon({ species: "abra", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(yanma, abra);
    stage.until(900, function () { return stage.casts("bugbuzz", yanma) > 0 && stage.damageTo(abra) > 0; }, function () {
        stage.expect(stage.casts("bugbuzz", yanma) > 0, "虫鸣被放出来了");
        stage.expect(stage.damageTo(abra) > 0, "声波扫到了目标身上");
        stage.note("碾防（约 10% 基础）与远端衰减是随机/位置结果，只作记录；声波不被墙面阻挡。",
            { casts: stage.casts("bugbuzz", yanma), damage: Math.round(stage.damageTo(abra) * 10) / 10 });
        stage.done();
    }, "声波扫到目标");
});
