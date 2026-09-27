/**
 * 居合斩 / cut —— 可执行设计说明。
 *
 * 一句话：一趟脚高的贴地宽横斩扫过身前扇形，弧里的敌人各吃一记接触斩击，弧里的草木被顺手割掉。
 *
 * 场面：一只只会居合斩的猫鼬斩（40 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）；
 * 两人之间的低层铺草，远端两格换成可碰撞的树叶，用来观察清场。
 * 选取为 `kind: "aim"`，AI 仍按仇恨推荐这个敌人。
 * 断言只取必然事实：这招被提交过、目标受过伤害、弧内至少割掉一格可碰撞树叶。
 * 割草射线在预算内先真正割掉可剪植物、再继续查后方实墙，判定与表现共用同一脚底刃带的墙裁切，写进 note。
 */
Smoke.scenario("cut", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    for (var x = 0; x <= 2; x++) for (var z = -1; z <= 1; z++) stage.block([x, 0, z], "minecraft:short_grass");
    stage.block([2, 0, 1], "minecraft:oak_leaves");
    stage.block([2, 0, -1], "minecraft:oak_leaves");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 40, moves: ["cut"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(600, function () {
        return stage.casts("cut", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        var changed = stage.changedBlocks(), plantsCut = 0, leavesCut = 0;
        for (var index = 0; index < changed.length; index++) {
            if (changed[index].after !== "minecraft:air") continue;
            plantsCut++;
            if (changed[index].before === "minecraft:oak_leaves") leavesCut++;
        }
        stage.expect(stage.casts("cut", caster) >= 1, "caster committed cut");
        stage.expect(stage.damageTo(foe) > 0, "cut dealt damage to the foe");
        stage.expect(leavesCut >= 1, "a collidable leaf inside the arc was cut");
        stage.note("the swept band, the visible arc and the shear rays share the feet anchor in skill.ts; a low plant is only passed once this swing really cut it (budget-limited), and the wall behind it still clips the ray", {
            casts: stage.casts("cut", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            plantsCut: plantsCut,
            leavesCut: leavesCut,
            clearedCells: changed.length,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "cut lands within 30 s");
});
