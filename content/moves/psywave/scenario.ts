/**
 * 精神波 / psywave —— 可执行设计说明。
 *
 * 一句话：推出一道不稳定的念力波前，穿透一排目标，每次伤害都不同。
 *
 * 场面：只带这一招的超能力系对手，两只关掉 AI 的铁傀儡排在同一条瞄准线上（演示穿透）。
 * 断言：本招被放出过、第一个铁傀儡吃到过伤害。第二个是否也被穿到、本此强度、命中数写进 note。
 */
Smoke.scenario("psywave", function (stage) {
    stage.fill([-12, -1, -9], [12, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "starmie", level: 45, moves: ["psywave"], at: [-8, 0, 0], properties: "nature=modest" });
    // 两只无招式、不会反击的目标排在同一条瞄准线上：波前应穿过第一个继续追第二个。
    var front = stage.pokemon({ species: "rattata", level: 12, moves: [], at: [0, 0, 0] });
    var back = stage.pokemon({ species: "rattata", level: 12, moves: [], at: [3, 0, 0] });
    stage.hostile(user, front);
    stage.hostile(user, back);
    stage.until(1200, function () {
        return stage.casts("psywave", user) > 0 && stage.damageTo(front) > 0 && stage.damageTo(back) > 0;
    }, function () {
        stage.expect(stage.casts("psywave", user) > 0, "starmie committed psywave");
        stage.expect(stage.damageTo(front) > 0, "the wave dealt damage to the first target");
        stage.expect(stage.damageTo(back) > 0, "the wave pierced through to the second target");
        stage.note("the wave pierces a line of non-allies; per-cast damage is rolled from (1 - swing) to (1 + swing) and applied to every target the front passes.", {
            casts: stage.casts("psywave", user),
            dealt: Math.round(stage.damageBy(user) * 10) / 10,
            frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
            backDamage: Math.round(stage.damageTo(back) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "psywave lands on the first target within 60 s");
});
