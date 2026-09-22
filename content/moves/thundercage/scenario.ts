/**
 * 雷电囚笼 / thundercage —— 可执行设计说明。
 *
 * 一句话：一道电击命中后在目标四周立起一圈竖着的电流栅栏，把它关在笼内，笼内持续劈电、越界就被弹回并电击。
 *
 * 场面：特攻不错的泥巴鱼带这一招，对一只被冻住 AI、站在原地的铁傀儡（耐打又不会还手、不会走开的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`。
 * 暴击、麻痹判定与越界电击都写进 note 供读轨迹判断。
 */
Smoke.scenario("thundercage", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "stunfisk", level: 42, moves: ["thundercage"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("thundercage", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped");
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("thundercage", caster) >= 1, "stunfisk committed thunder cage");
            stage.expect(stage.damageTo(heavy) > 0, "the cage shocked the target at least once");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.note("the hit roll, the crit and any paralysis roll are random", {
                casts: stage.casts("thundercage", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                paralyzed: stage.hasMobEffect(heavy, "world_combat:status/paralysis"),
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "thunder cage lands within 45 s");
});
