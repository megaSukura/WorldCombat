/**
 * 旋风刀 / razorwind —— 可执行设计说明。
 *
 * 一句话：站定把气流拧成一把把风之刃，蓄够了把正前方铺成一个扇面甩出去，扇面里的敌人各挨一记；暴击率高一档。
 *
 * 场面：一只只会旋风刀的喷火龙（45 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 断言只取必然事实：这招被提交过、目标受过伤害。蓄力期间的暴击与同时扫到几个人是随机的，写进 note。
 */
Smoke.scenario("razorwind", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "charizard", level: 45, moves: ["razorwind"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("razorwind", caster) >= 2 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("razorwind", caster) >= 1, "caster committed razorwind");
        stage.expect(stage.damageTo(foe) > 0, "razorwind dealt damage to the foe");
        stage.note("critical hits come from the native critRatio 2 roll; the fan can cut several foes at once, see the trace", {
            casts: stage.casts("razorwind", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            casterAt: caster.position(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "razorwind lands within 35 s");
});
