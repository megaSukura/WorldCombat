/**
 * 十字剪 / xscissor —— 可执行设计说明。
 *
 * 一句话：两刃从身体左右同时合拢成一剪，夹口扫到的目标各被剪一次。
 *
 * 场面：一只只会十字剪的飞天螳螂（42 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害。夹口到底扫到几个、是否吃到合剪加成写进 note。
 */
Smoke.scenario("xscissor", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 42, moves: ["xscissor"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("xscissor", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("xscissor", caster) >= 1, "caster committed x-scissor");
        stage.expect(stage.damageTo(foe) > 0, "the closing jaw cut the foe");
        stage.note("a foe inside the jaw is settled once per close; the reported hit count should not exceed the cast count because both blades share one hit set", {
            casts: stage.casts("xscissor", caster),
            hits: stage.hits(foe, true),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "x-scissor lands within 30 s");
});
