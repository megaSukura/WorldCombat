/**
 * 佯攻 / feint —— 可执行设计说明。
 *
 * 一句话：一次假动作把对手撑起的守护掀掉，紧接着的一戳才真正打进去。
 *
 * 场面：石头地面、晴空正午。一只只会「佯攻」的 sneasel（技能表只给这一招，AI 就只会用它）对上一只只会
 *   「守住」的 slowpoke——slowpoke 感到威胁会自己撑罩，正好给佯攻一个可掀的守护。双方敌对开战。
 * 必然事实：佯攻被提交过、施法者对目标造成过伤害。
 *   这次到底掀掉了几层守护、目标有没有真的撑起罩、伤害与暴击的随机量，写进 note；smoke API 读不到守护状态，
 *   掀护层的实际效果由人工试玩确认。
 */
Smoke.scenario("feint", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.fill([-10, 0, -10], [10, 10, 10], "minecraft:air");
    stage.weather("clear");
    stage.time("noon");
    var fox = stage.pokemon({ species: "sneasel", level: 40, moves: ["feint"], at: [-3, 0, 0], properties: "nature=jolly" });
    var tank = stage.pokemon({ species: "slowpoke", level: 25, moves: ["protect"], at: [3, 0, 0] });
    stage.hostile(fox, tank);
    stage.until(1500, function () {
        return stage.casts("feint", fox) >= 1 && stage.damageTo(tank) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("feint", fox) >= 1, "sneasel committed feint");
            stage.expect(stage.damageTo(tank) > 0, "the jab dealt damage to the target");
            stage.note("feint is a fast jab that strips the target's guards (any GuardEffects pool) before it lands; whether slowpoke actually raised a guard in this run changes how many layers were stripped, which the smoke API cannot read. Random parts: damage roll and crit, and whether protect came up in time.", {
                casts: stage.casts("feint", fox),
                damageToTank: Math.round(stage.damageTo(tank) * 10) / 10,
                foxTravelled: Math.round(stage.travelled(fox) * 10) / 10,
                tankCasts: stage.casts("protect", tank),
                tankAlive: tank.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "feint lands on the target within 75 s");
});
