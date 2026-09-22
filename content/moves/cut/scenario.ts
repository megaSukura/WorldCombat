/**
 * 居合斩 / cut —— 可执行设计说明。
 *
 * 一句话：一趟贴地的宽横斩扫过身前扇形，弧里的敌人各吃一记接触斩击，弧里的草叶被顺手割掉。
 *
 * 场面：一只只会居合斩的猫鼬斩（40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）；
 * 两人之间铺一片矮草，用来观察清场。断言只取必然事实：这招被提交过、目标受过伤害。割掉几株写进 note。
 */
Smoke.scenario("cut", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    for (let x = 0; x <= 2; x++) for (let z = -1; z <= 1; z++) stage.block([x, 0, z], "minecraft:short_grass");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 40, moves: ["cut"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("cut", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("cut", caster) >= 1, "caster committed cut");
        stage.expect(stage.damageTo(foe) > 0, "cut dealt damage to the foe");
        stage.note("plants inside the swept arc are cut with breakBlock; how many depends on the caster's facing", {
            casts: stage.casts("cut", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            clearedCells: stage.changedBlocks().length,
            cleared: stage.changedBlocks().slice(0, 6),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "cut lands within 30 s");
});
