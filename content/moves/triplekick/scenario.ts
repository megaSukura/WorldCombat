/**
 * 三连踢 / triplekick —— 可执行设计说明。
 *
 * 一句话：朝释放方向一脚接一脚地直踢，每脚取真实首碰、每中一脚下一脚更重，任一脚落空这串就停。
 *
 * 场面：只会三连踢的飞腿郎（50 级，原生真实学习者）对一只被点住、不会还手的铁傀儡（厚血靶子，紧贴踢程内，
 * 不燃烧、不干扰伤害口径）出手；硬石平地。断言只取必然事实：这招被提交过、目标受到过伤害。
 * 实际踢出几脚、第几脚落空写进 note。
 */
Smoke.scenario("triplekick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hitmonlee", level: 50, moves: ["triplekick"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:240}],Health:240f}");
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("triplekick", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 20;
    }, function () {
        stage.expect(stage.casts("triplekick", caster) >= 1, "caster committed triple kick");
        stage.expect(stage.damageTo(foe) > 0, "triple kick dealt damage to the foe");
        stage.note("each of the three kicks rolls its own accuracy (default 92%), takes the first real contact along the locked aim and rises in power; the first two shove only a quarter so the target stays in line, and the last carries the rest", {
            casts: stage.casts("triplekick", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "triple kick lands within 60 s");
});
