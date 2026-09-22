/**
 * 波导弹的可执行设计说明：让会这一招的格斗系精灵朝一名移动缓慢的普通系目标发一颗波导球，
 * 验证球被放出来并命中造成伤害。追踪能否咬住在飞行中移动的目标是随机／位置的，写进 note。
 */
Smoke.scenario("aurasphere", function (stage) {
    var lucario = stage.pokemon({ species: "lucario", level: 35, moves: ["aurasphere"], at: [-6, 0, 0] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(lucario, snorlax);
    stage.until(900, function () { return stage.casts("aurasphere", lucario) > 0 && stage.damageTo(snorlax) > 0; }, function () {
        stage.expect(stage.casts("aurasphere", lucario) > 0, "波导弹被放出来了");
        stage.expect(stage.damageTo(snorlax) > 0, "波导球打到了目标身上");
        stage.note("球会一路朝目标修正方向，所以目标在飞行中移动也甩不掉（必中）。变量：伤害浮动、暴击、以及目标恰好在这一刻走出锁定距离的极少数情况。",
            { casts: stage.casts("aurasphere", lucario), damage: Math.round(stage.damageTo(snorlax) * 10) / 10 });
        stage.done();
    }, "波导球命中目标");
});
