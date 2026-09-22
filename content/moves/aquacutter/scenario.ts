/**
 * 水波刀 / aquacutter —— 可执行设计说明。
 *
 * 一句话：一道加压的水线笔直喷出，切穿沿途的目标并把它们淋透。
 *
 * 场面：一只只会水波刀的艾路雷朵（45 级）对一只被点住、不会还手的铁傀儡。
 * 断言只取必然事实：这招被提交过、目标受过伤害、目标被溅湿（共享身份 world_combat:status/soaked）。
 * 暴击是否出现、一道水线贯穿了几个目标都带随机与时序，写进 note。
 */
Smoke.scenario("aquacutter", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gallade", level: 45, moves: ["aquacutter"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("aquacutter", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("aquacutter", caster) >= 1, "caster committed aqua cutter");
        stage.expect(stage.damageTo(foe) > 0, "aqua cutter dealt damage to the foe");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/soaked"), "the cut drenched the foe (shared soaked identity)");
        stage.note("critical hits come from the native critRatio 2 roll; whether the jet also pierces a second foe depends on where it stands, and this stage has a single target", {
            casts: stage.casts("aquacutter", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            soaked: stage.hasMobEffect(foe, "world_combat:aquacutter_soaked"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "aqua cutter lands within 30 s");
});
