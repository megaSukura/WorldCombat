/**
 * 落英缤纷 / petalblizzard —— 可执行设计说明。
 *
 * 一句话：原地转起一阵落英旋风，第一阵把身周的花瓣与敌人朝自己卷拢，其后的几阵把它们一起甩开；
 * 每一阵都割伤圈内的敌人，被甩出去的花瓣落地后随即散尽、不改变世界方块。
 *
 * 场面：草系的裙儿小姐带这一招，站在两只小敌中间，地面铺草，逼出「一次割一圈」的场面。
 *
 * 断言只取必然事实：这招被放过、至少一只小敌挨到伤害、风暴过后地面方块没有改动（不再铺花场）。阵数、
 * 暴击、被拽近还是甩远写进 note。
 */
Smoke.scenario("petalblizzard", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:grass_block");
    stage.fill([-9, 0, -7], [9, 0, 7], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lilligant", level: 40, moves: ["petalblizzard"], at: [0, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.4, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.7, 0, 1.0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1200, function () {
        return stage.casts("petalblizzard", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        // 等花瓣落定后再核对地面留下的东西。
        stage.after(20, function () {
            stage.expect(stage.casts("petalblizzard", caster) >= 1, "lilligant committed petal blizzard");
            stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the petal storm cut a foe");
            stage.expect(stage.changedBlocks().length === 0, "the storm left no block field behind");
            stage.note("gust count, the crit roll, and whether a foe was pulled in or thrown out are random/positional", {
                casts: stage.casts("petalblizzard", caster),
                firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
                secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
                firstTravelled: Math.round(stage.travelled(first) * 10) / 10,
                changed: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "petal blizzard cuts a foe within 60 s");
});
