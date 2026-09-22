/**
 * 泡沫光线 / bubblebeam 的可执行设计说明。
 *
 * 场面：只会泡沫光线的杰尼龟（32 级）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）。
 * 必然事实：本招被提交过、目标受过伤害、目标身上出现过共享身份 foamed（泡沫黏上去了）。
 * 掉速是约 10% 起的随机结果（本单元 slowChance）、泡数与黏着时长随特攻／等级／配置变化，写进 note。
 */
Smoke.scenario("bubblebeam", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 32, moves: ["bubblebeam"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..9,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("bubblebeam", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/foamed");
    }, function () {
        stage.expect(stage.casts("bubblebeam", caster) > 0, "bubblebeam was committed");
        stage.expect(stage.damageTo(foe) > 0, "the foam hit the foe");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/foamed"), "the foe carried the shared foamed identity");
        stage.note("the speed drop is a roughly 10% base roll (bubblebeam.slowChance); bubble count, cling duration, stages and radius follow Sp. Atk/level/body and the dense/jet choice", {
            casts: stage.casts("bubblebeam", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foamed: stage.hadMobEffect(foe, "world_combat:status/foamed"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "bubblebeam lands and leaves the foe foamed within 45 s");
});
