/**
 * 洁净光芒的可执行设计说明：让会这一招的精灵朝正前方的对手打出一束强光，验证它张开成光扇、命中并造成伤害。
 * 逐个敌人只结算一次、碾防（约 50% 基础概率）与光扇张角是随机/位置结果，写进 note 供读轨迹判断；
 * 施法者本次不移动、不追踪，光扇只朝提交时的方向张开。
 */
Smoke.scenario("lusterpurge", function (stage) {
    var latios = stage.pokemon({ species: "latios", level: 40, moves: ["lusterpurge"], at: [-2.5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(latios, machop);
    stage.until(900, function () { return stage.casts("lusterpurge", latios) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("lusterpurge", latios) > 0, "洁净光芒被放出来了");
        stage.expect(stage.damageTo(machop) > 0, "光扇照到了正前方的目标身上");
        stage.note("本招现在是朝瞄准方向的一束短光扇：细芯先存在、再向两侧张开，被 trace 确认光路未被墙挡住的敌人最多各结算一次；碾防（约 50% 基础）与逐 tick 张开是随机/位置结果，只作记录。",
            { casts: stage.casts("lusterpurge", latios), damage: Math.round(stage.damageTo(machop) * 10) / 10 });
        stage.done();
    }, "光扇照到正前方目标");
});
