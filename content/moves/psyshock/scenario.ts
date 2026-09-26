/**
 * 精神冲击 / psyshock —— 可执行设计说明。
 *
 * 一句话：把念波压成实心棱投出去，走直线、下坠，撞上按物理防御结算。
 *
 * 场面：一只只带这一招的超能力系特攻手，对一只血厚、关掉 AI 的铁傀儡（高物防、站着不动，保证棱能撞上）。
 * 断言：本招被放出过、铁傀儡吃到过伤害。是否命中、伤害高低受移动与物防影响，写进 note。
 */
Smoke.scenario("psyshock", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "alakazam", level: 45, moves: ["psyshock"], at: [-5, 0, 0], properties: "nature=modest" });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.hostile(user, foe);
    stage.after(10, function () { stage.command("data merge entity @e[type=minecraft:iron_golem] {NoAI:1b}"); });
    stage.until(1200, function () {
        return stage.casts("psyshock", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psyshock", user) > 0, "alakazam committed psyshock");
        stage.expect(stage.damageTo(foe) > 0, "the materialized shard dealt damage");
        stage.note("the shard is aimed freely (a direction or point works with no enemy); it flies straight and unguided, so the stationary golem under the aim point guarantees a hit. Damage settles against the target's physical Defence (native overrideDefensiveStat). Terrain would only shatter the shard; this open arena has nothing in the flight path to demonstrate it.", {
            casts: stage.casts("psyshock", user),
            dealt: Math.round(stage.damageBy(user) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "psyshock lands on the target within 60 s");
});
