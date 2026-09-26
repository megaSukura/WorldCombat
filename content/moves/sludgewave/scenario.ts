/**
 * 污泥波 / sludgewave —— 可执行设计说明。
 *
 * 一句话：把厚污泥自身体一次向周围泼开，近身一圈的敌人一起挨伤、被推开、可能中毒；泼过即散，不留危险场。
 *
 * 场面：浑身烂泥的臭臭泥带这一招，站在两只小敌中间；小敌用撞击还手，逼出被围住时一次泼到近身一圈的场面。
 *
 * 断言只取必然事实：这招被放过、至少一只小敌挨到伤害、地面方块不被改动。中毒是否触发（约 10% 的随机掷）写进 note。
 */
Smoke.scenario("sludgewave", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "muk", level: 40, moves: ["sludgewave"], at: [0, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.6, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.9, 0, 1.0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1200, function () {
        return stage.casts("sludgewave", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("sludgewave", caster) >= 1, "muk committed sludge wave");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the sludge splash dealt damage");
        stage.expect(stage.changedBlocks().length === 0, "the splash left the ground blocks untouched");
        stage.note("crit, the poison roll and how many stay in the splash are random/positional", {
            casts: stage.casts("sludgewave", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            anyPoisoned: stage.hadMobEffect(first, "world_combat:status/poison") || stage.hadMobEffect(second, "world_combat:status/poison"),
            changed: stage.changedBlocks().length,
            firstAlive: first.alive()
        });
        stage.done();
    }, "sludge wave washes over a foe within 60 s");
});
