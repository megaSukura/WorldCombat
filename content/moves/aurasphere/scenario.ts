/**
 * 波导弹的可执行设计说明：让会这一招的格斗系精灵朝一名移动缓慢的普通系目标发一颗波导球，
 * 验证球被放出来并命中造成伤害。球按有限转向追目标、飞尽则用真实弹末点收尾，能否咬住移动目标是随机／位置的，写进 note。
 */
Smoke.scenario("aurasphere", function (stage) {
    var lucario = stage.pokemon({ species: "lucario", level: 35, moves: ["aurasphere"], at: [-6, 0, 0] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(lucario, snorlax);
    stage.until(900, function () { return stage.casts("aurasphere", lucario) > 0 && stage.damageTo(snorlax) > 0; }, function () {
        stage.expect(stage.casts("aurasphere", lucario) > 0, "波导弹被放出来了");
        stage.expect(stage.damageTo(snorlax) > 0, "波导球打到了目标身上");
        stage.note("球按有限转向朝目标修正方向，锁定活体时实际飞「锁定距离 + 6 格」，但急转向、撞墙或跑出锁定距离仍会失手；飞尽时用 world.projectilePosition 的真实弹末点散球，不用原方向推算终点。仅伤害回执成立才播成功爆点，被拒绝/撞墙只散球。当前为 kind:aim：点实体时挂追踪，只给方向或世界点则沿所选方向直飞。本场景跑 AI 带目标这条路径。变量：伤害浮动、暴击、以及目标恰好在这一刻走出锁定距离的极少数情况。",
            { casts: stage.casts("aurasphere", lucario), damage: Math.round(stage.damageTo(snorlax) * 10) / 10 });
        stage.done();
    }, "波导球命中目标");
});
