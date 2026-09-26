/**
 * 精神击破 / psystrike —— 可执行设计说明。
 *
 * 一句话：在标记点正上方堆出重物竖直砸下，按物理防御结算并削受伤者特防。
 *
 * 场面：只带这一招的超梦，对一只血厚、关掉 AI 的铁傀儡（站着不动，保证竖直下砸命中）。
 * 断言：本招被放出过、铁傀儡吃到过伤害。落点固定、不横向追踪、屋顶拦截与特防下降写进 note
 *   （需要屋顶构造的隔顶判定无法在这块空场里产生，属场景无法覆盖的部分）。
 */
Smoke.scenario("psystrike", function (stage) {
    stage.fill([-12, -1, -9], [12, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "mewtwo", level: 70, moves: ["psystrike"], at: [-7, 0, 0], properties: "nature=modest" });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.hostile(user, foe);
    stage.after(10, function () { stage.command("data merge entity @e[type=minecraft:iron_golem] {NoAI:1b}"); });
    stage.until(1400, function () {
        return stage.casts("psystrike", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psystrike", user) > 0, "mewtwo committed psystrike");
        stage.expect(stage.damageTo(foe) > 0, "the overhead mass dealt damage");
        stage.note("the landing point is fixed at commit and the mass falls straight down without tracking; the stationary golem sits under that point and takes the crush. Damage settles against physical Defence (native overrideDefensiveStat) and only the wounded body's Sp. Def drops by 1 stage; the stage change is not directly observable through the smoke API.", {
            casts: stage.casts("psystrike", user),
            dealt: Math.round(stage.damageBy(user) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "psystrike lands on the target within 70 s");
});
