/**
 * 蛮干的可执行设计说明。
 *
 * 场面：一只生命上限低的精灵（地鼠，30 级）对一只生命上限高得多的精灵（吉利蛋，30 级），相距 2 格。
 * 双方都只会蛮干，因此只有落后的一方（地鼠）能打出伤害：地鼠满血仍远低于吉利蛋，「对手生命 − 自己生命」
 * 一开始就是正数，AI 的条件必然成立；吉利蛋这一侧生命差为负，只会扑出空响。
 * 必然事实：本招被提交过；吉利蛋受到过蛮干伤害；地鼠的扑身让它移动过。
 * 命中率 100；伤害量、暴击、吉利蛋是否被一记打空、它会不会逃跑都随数值与走位变化，写进 note 供读轨迹判断。
 * 命中浮字显示的是原生受伤入口实际扣掉的生命（不是预估的差额）；属性免疫或护盾完全挡下时走「被挡」而不是成功平血。
 * 选取为 `kind: "aim"`：手动可朝方向/地点空扑，这里交给 AI 按仇恨推荐目标。
 */
Smoke.scenario("endeavor", function (stage) {
    stage.time("night");
    var digger = stage.pokemon({ species: "diglett", level: 30, moves: ["endeavor"], at: [-3, 0, 0] });
    var tank = stage.pokemon({ species: "chansey", level: 30, moves: ["endeavor"], at: [3, 0, 0] });
    stage.hostile(digger, tank);
    stage.until(900, function () {
        return stage.casts("endeavor", digger) > 0 && stage.damageTo(tank) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("endeavor", digger) > 0, "diglett committed endeavor");
            stage.expect(stage.damageTo(tank) > 0, "endeavor pulled the target's HP down toward the user's");
            stage.expect(stage.travelled(digger) > 0.3, "the lunge moved the user");
            stage.note("endeavor only bites when the user is behind: diglett's max HP is far below chansey's, so the gap is positive at full health. A healthy user deals nothing (flat). Damage amount, crit, whether one blow empties the tank, and any flee are all variable.", {
                casts: stage.casts("endeavor", digger),
                damageToTank: Math.round(stage.damageTo(tank) * 10) / 10,
                damageToDigger: Math.round(stage.damageTo(digger) * 10) / 10,
                diggerTravelled: Math.round(stage.travelled(digger) * 10) / 10,
                tankAlive: tank.alive(), tankHealth: Math.round(tank.health() * 10) / 10,
                diggerAlive: digger.alive(), diggerHealth: Math.round(digger.health() * 10) / 10
            });
            stage.done();
        });
    }, "endeavor is cast and equalizes the target within 45 s");
});
