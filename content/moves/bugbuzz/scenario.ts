/**
 * 虫鸣的可执行设计说明：让会这一招的精灵朝一名对手鸣一声，验证声波命中、造成伤害。
 * 声波是单次瞬发：身体发出一圈压缩环、整片锥形范围同时短促共振，不做跨多刻的远传阶段。
 * 碾防（约 10% 基础概率）与远端衰减是随机/位置结果，写进 note 供读轨迹判断。
 * 穿墙是这招明确保留的策略，但共享威胁感知按视线过滤，AI 主动对被墙挡住的对手起手属人工游玩范围。
 */
Smoke.scenario("bugbuzz", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var yanma = stage.pokemon({ species: "yanma", level: 34, moves: ["bugbuzz"], at: [-4, 0, 0] });
    var abra = stage.pokemon({ species: "abra", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(yanma, abra);
    stage.until(900, function () { return stage.casts("bugbuzz", yanma) > 0 && stage.damageTo(abra) > 0; }, function () {
        stage.expect(stage.casts("bugbuzz", yanma) > 0, "虫鸣被放出来了");
        stage.expect(stage.damageTo(abra) > 0, "声波扫到了目标身上");
        stage.note("整道声波只结算一次；碾防（约 10% 基础）与远端衰减是随机/位置结果，只作记录。表现是一次从身体发出的压缩环加全范围短共振，不再一重重远传。声波不被墙面阻挡。",
            { casts: stage.casts("bugbuzz", yanma), damage: Math.round(stage.damageTo(abra) * 10) / 10 });
        stage.done();
    }, "声波扫到目标");
});
