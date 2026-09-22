// 挑衅的可执行设计说明：让一只高速的挑衅者对着近处的敌人只喊这一句。
// 必然事实：挑衅被放出来过；目标身上出现过共享身份 world_combat:status/taunt。
// 怒火期间目标的变化招式被拒几次、怒火实际烧了多久，写进 note 供读轨迹判断。
Smoke.scenario("taunt", function (stage) {
    var caster = stage.pokemon({ species: "zoroark", level: 40, moves: ["taunt"], at: [-4, 0, 0] });
    // 只会变化招式的对手：被点着之后它的 playnice 提交会被共享动作策略拒绝。
    var target = stage.pokemon({ species: "magikarp", level: 20, moves: ["playnice"], at: [4, 0, 0] });
    stage.hostile(target, caster);
    stage.until(900, function () {
        return stage.casts("taunt", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/taunt");
    }, function () {
        stage.expect(stage.casts("taunt", caster) > 0, "taunt was cast");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/taunt"), "target carried the shared taunt identity");
        stage.note("挑衅命中后目标带怒火身份；怒火期间目标的变化招式在提交点被拒绝（本场景对手机器人会尝试 playnice，被拒的提交不进 casts，所以次数偏少即封锁生效）。怒火时长随等级与特攻变化，命中是直线判定，掩体与走位会让它落空。", {
            casts: stage.casts("taunt", caster), targetHp: target.health(), casterHp: caster.health(),
            targetStatusMoveCasts: stage.casts("playnice", target)
        });
        stage.done();
    }, "taunt enrages the target");
});
