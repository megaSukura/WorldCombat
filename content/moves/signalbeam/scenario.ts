/**
 * 信号光束 的可执行设计说明：让会这一招的毒粉蛾朝一名对手射出左右两条细束，验证两束被放出、束线罩到目标并造成伤害，
 * 且同一发里两束在单体目标身上各结算一次（各半、重叠即满）。
 * 错乱（基础 10% 起）、脉冲模式、以及瞄点距离改变两束张开几何都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("signalbeam", function (stage) {
    var venomoth = stage.pokemon({ species: "venomoth", level: 32, moves: ["signalbeam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 24, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(venomoth, machop);
    stage.until(900, function () { return stage.casts("signalbeam", venomoth) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("signalbeam", venomoth) > 0, "左右两条细束被射出来了");
        stage.expect(stage.damageTo(machop) > 0, "落在束线上的目标被照到并造成伤害");
        var receipts = stage.damageEvents(), halves = 0;
        for (var i = 0; i < receipts.length; i++) if (receipts[i].to === machop.name && receipts[i].amount > 0) halves++;
        stage.expect(halves >= 2, "交点对准身体时两束各结算一次（各半、重叠即满）");
        stage.note("瞄点距离改变张开几何、单束被墙挡只剩半束，都是位置/配置结果，只作记录。",
            { casts: stage.casts("signalbeam", venomoth), damage: Math.round(stage.damageTo(machop) * 10) / 10, halves: halves,
              jammed: stage.hasMobEffect(machop, "world_combat:status/confusion") });
        stage.done();
    }, "双束束线照到目标");
});
