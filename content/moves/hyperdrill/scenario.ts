/**
 * 强力钻 / hyperdrill —— 可执行设计说明。
 *
 * 一句话：把尖端旋成钻头，沿当前瞄准方向直直凿穿，在真实首接触点先把守护整层凿开再砸进去。
 *
 * 场面：石头地面、晴夜。一只只会「强力钻」的 dudunsparce（技能表只给这一招，AI 就只会用它）对上一只
 *   僵尸——僵尸会自己贴上来，是直线凿穿招式的合适靶子；夜里白天都不受影响。
 * 必然事实：强力钻被提交过、施法者对僵尸造成过伤害。
 *   这一钻有没有真的凿到守护、凿开几层、钻穿了几个人、有没有在推不动的目标前收势、伤害与暴击的随机量，写进
 *   note；smoke API 读不到守护状态，凿护层与停点由人工试玩确认。
 */
Smoke.scenario("hyperdrill", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
    stage.fill([-12, 0, -12], [12, 10, 12], "minecraft:air");
    stage.weather("clear");
    stage.time("night");
    var worm = stage.pokemon({ species: "dudunsparce", level: 48, moves: ["hyperdrill"], at: [-4, 0, 0], properties: "nature=adamant" });
    var bag = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(worm, bag);
    stage.until(1600, function () {
        return stage.casts("hyperdrill", worm) >= 1 && stage.damageTo(bag) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("hyperdrill", worm) >= 1, "dudunsparce committed hyper drill");
            stage.expect(stage.damageTo(bag) > 0, "the drill dealt damage to the target");
            stage.note("hyper drill lunges along its aim and, on each new real contact, tears guard layers before the contact hit; against an unguarded zombie only the hit shows. When the target will not budge it stops at the real contact instead of clipping through. Random parts: damage roll, crit and whether the target survives. Pierce targets are only observable against a guarded, lined-up foe, which needs a manual playtest.", {
                casts: stage.casts("hyperdrill", worm),
                dealt: Math.round(stage.damageBy(worm) * 10) / 10,
                targetDamage: Math.round(stage.damageTo(bag) * 10) / 10,
                travelled: Math.round(stage.travelled(worm) * 10) / 10,
                targetAlive: bag.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "hyper drill lands on the target within 80 s");
});
