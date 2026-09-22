/**
 * 喷烟 / lavaplume —— 可执行设计说明。
 *
 * 一句话：先从身上向上喷起一道熔岩烟柱，再向外塌成一道火环，圈内敌人一起挨烧、可能灼伤。
 *
 * 场面：浑身熔岩的熔岩蜗牛带这一招，站在两只小敌中间；小敌用撞击还手，逼出被围住时一次烧一圈的场面。
 *
 * 断言只取必然事实：这招被放过、至少一只小敌挨到伤害。灼伤是否触发（约 20% 的随机掷）写进 note。
 */
Smoke.scenario("lavaplume", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magcargo", level: 40, moves: ["lavaplume"], at: [0, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.6, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2.9, 0, 1.0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(1200, function () {
        return stage.casts("lavaplume", caster) >= 1 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.expect(stage.casts("lavaplume", caster) >= 1, "magcargo committed lava plume");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the fire ring dealt damage");
        stage.note("crit, the burn roll and the fume ember ticks are random and positional", {
            casts: stage.casts("lavaplume", caster),
            firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
            secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
            anyBurned: stage.hadMobEffect(first, "world_combat:status/burn") || stage.hadMobEffect(second, "world_combat:status/burn"),
            firstAlive: first.alive()
        });
        stage.done();
    }, "lava plume scalds a foe within 60 s");
});
