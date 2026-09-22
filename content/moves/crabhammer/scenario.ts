/**
 * 蟹钳锤 / crabhammer —— 可执行设计说明。
 *
 * 一句话：一只只会蟹钳锤的精灵贴到对手身上，把大钳子高举过顶后垂直砸下，落点荡开一圈水浪。
 * 必然事实：本招被砸出过、目标受到过伤害（正面目标吃 slam）；裂甲是否生效取决于档位，写进 note。
 * 水环半径、掀开距离与是否砸到多个取决于体重、站位与档位，写进 note 供读轨迹判断。
 */
Smoke.scenario("crabhammer", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crawdaunt", level: 48, moves: ["crabhammer"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(800, function () {
        return stage.casts("crabhammer", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("crabhammer", caster) >= 1, "crabhammer was hoisted and brought down");
        stage.expect(stage.damageTo(foe) > 0, "the pincer slam damaged the foe");
        stage.note("正面目标吃 slam 并按 shove 被掀开；shockRadius 内的其他敌人吃 shock。默认重锤式不破甲；裂甲式才在命中时敲裂目标物防 1 级。本场景是单挑靶子，只读正面那一砸。", {
            casts: stage.casts("crabhammer", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "the slam lands within 40 s");
});
