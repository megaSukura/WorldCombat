/**
 * 火焰旋涡 / firespin —— 可执行设计说明。
 *
 * 一句话：把一撮火甩到目标身上，命中先烧一下，随后一道火柱贴着目标立起、跟着它走，持续舔火并尝试点燃。
 *
 * 场面：特攻不低的鸭嘴火兽带这一招，对一只被冻住 AI、站在原地的铁傀儡（耐打又不会还手、不会走开的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`。
 * 是否点燃、暴击、湿身熄灭的时机都写进 note 供读轨迹判断。
 */
Smoke.scenario("firespin", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magmar", level: 40, moves: ["firespin"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("firespin", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped");
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("firespin", caster) >= 1, "magmar committed fire spin");
            stage.expect(stage.damageTo(heavy) > 0, "the fire licked the target at least once");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.note("the hit roll, the crit roll and whether the burn roll landed are random", {
                casts: stage.casts("firespin", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                burned: stage.hasMobEffect(heavy, "world_combat:status/burn"),
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "fire spin lands within 45 s");
});
