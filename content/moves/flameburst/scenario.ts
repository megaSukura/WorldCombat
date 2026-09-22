/**
 * 烈焰溅射 / flameburst —— 可执行设计说明。
 *
 * 一句话：射出一颗会溢出的火焰弹，命中点炸开并把火甩到主目标旁边的每个对手身上。
 *
 * 场面：只会烈焰溅射的喷火龙（Charizard，火/飞、特攻高）对两只被点住、并排站着的铁傀儡（相距 2 格）。
 * 断言只取必然事实：这招被提交过、主目标受过伤害、旁边那只也被溅射伤害到（两只都不动、距离在溅射半径内，
 * 几何是确定的）。暴击、命中瞬间主目标是谁、火滴数量随特攻的差异都写进 note。
 */
Smoke.scenario("flameburst", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "charizard", level: 45, moves: ["flameburst"], at: [-4, 0, 0] });
    var first = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var second = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 2] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("flameburst", caster) >= 1 && stage.damageTo(first) > 0 && stage.damageTo(second) > 0;
    }, function () {
        stage.expect(stage.casts("flameburst", caster) >= 1, "caster committed flame burst");
        stage.expect(stage.damageTo(first) > 0, "the burst dealt damage to the near golem");
        stage.expect(stage.damageTo(second) > 0, "the splash also reached the golem beside it");
        stage.note("which golem takes the burst and which takes the splash is positional; crit and droplet count scale with special attack. Both golems are NoAI and 2 blocks apart, inside the spread-form splash radius", {
            casts: stage.casts("flameburst", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            firstAlive: first.alive(),
            secondAlive: second.alive()
        });
        stage.done();
    }, "flame burst spills onto a neighbour within 45 s");
});
