/**
 * 种子炸弹 / seedbomb —— 可执行设计说明。
 *
 * 一句话：把一荚硬种高抛过顶，硬种从上方落在目标与周围一小圈上，圈里的非友方各挨一次整荚伤害。
 *
 * 场面：一只只会种子炸弹的妙蛙花（45 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 * 站在草地上。断言只取必然事实：这招被提交过、目标受过伤害。落种的数量、落点是否只罩住一个目标是设计值，写进 note。
 */
Smoke.scenario("seedbomb", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "venusaur", level: 45, moves: ["seedbomb"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("seedbomb", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("seedbomb", caster) >= 1, "caster committed seedbomb");
        stage.expect(stage.damageTo(foe) > 0, "seedbomb dealt damage to the foe");
        stage.note("the seed rain falls from above onto a ring; seed count (attack/level) drives the picture, the volley power comes from attack/weight", {
            casts: stage.casts("seedbomb", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "seedbomb lands within 30 s");
});
