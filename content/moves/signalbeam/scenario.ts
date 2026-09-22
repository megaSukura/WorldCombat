/**
 * 信号光束 的可执行设计说明：让会这一招的毒粉蛾朝排成一线的一名对手拉出信号走廊，验证走廊被放出、照到目标并造成伤害。
 * 错乱（基础 10% 起）、信号反冲与脉冲模式都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("signalbeam", function (stage) {
    var venomoth = stage.pokemon({ species: "venomoth", level: 32, moves: ["signalbeam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 24, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(venomoth, machop);
    stage.until(900, function () { return stage.casts("signalbeam", venomoth) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("signalbeam", venomoth) > 0, "信号走廊被拉出来了");
        stage.expect(stage.damageTo(machop) > 0, "走廊里的目标被照到并造成伤害");
        stage.note("错乱（基础 10% 起，特攻与等级提高）、错乱后的信号反冲、以及脉冲模式，都是随机或配置结果，只作记录。",
            { casts: stage.casts("signalbeam", venomoth), damage: Math.round(stage.damageTo(machop) * 10) / 10,
              jammed: stage.hasMobEffect(machop, "world_combat:status/confusion") });
        stage.done();
    }, "信号走廊照到目标");
});
