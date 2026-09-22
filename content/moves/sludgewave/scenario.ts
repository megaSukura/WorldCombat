/**
 * 污泥波 / sludgewave —— 可执行设计说明。
 *
 * 一句话：从脚下涌起一道黏稠的污泥潮，慢慢向外漫开，泡到的敌人一起挨伤、被推开、可能中毒，退去后留下泥洼。
 *
 * 场面：浑身烂泥的臭臭泥带这一招，站在两只小敌中间；小敌用撞击还手，逼出被围住时一次泡一圈的场面。
 *
 * 断言只取必然事实：这招被放过、至少一只小敌挨到伤害。中毒是否触发（约 10% 的随机掷）写进 note。
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
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the sludge tide dealt damage");
        stage.note("crit, the poison roll and how many stay in the tide are random/positional", {
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
