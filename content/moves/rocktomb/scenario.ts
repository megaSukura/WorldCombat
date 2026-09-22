/**
 * 岩石封锁 / rocktomb —— 可执行设计说明。
 *
 * 一句话：朝目标投一块重石头，砸中的目标速度下降；目标落地时它脚下立起一圈石柱把行动围住。
 *
 * 场面：会岩石封锁的隆隆岩（40 级，只给这一招）对一只厚血、站桩的卡比兽（50 级，只会跃起）投石；
 * 硬石地面，断言只取必然事实：这招被提交过、目标受到过伤害。
 * 石头是否砸实（原生命中 95 的落点）、围栏放下多少格、减速等级都写进 note 供读轨迹判断。
 * 共享状态在施加后的下一个 tick 才触发 `mob_effect_added`，所以断言前等几个 tick 再结算，
 * 否则会读到「效果还没登记」的假阴性。
 */
Smoke.scenario("rocktomb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([-9, 0, -7], [9, 0, 7], "minecraft:air");
    stage.fill([-9, 1, -7], [9, 1, 7], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "golem", level: 40, moves: ["rocktomb"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("rocktomb", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 12;
    }, function () {
        stage.expect(stage.casts("rocktomb", caster) >= 1, "caster committed rock tomb");
        stage.expect(stage.damageTo(foe) > 0, "rock tomb dealt damage to the foe");
        stage.note("the cage and the Speed drop need a grounded target; the cage ring replaces the ground and raises pillars", {
            casts: stage.casts("rocktomb", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            encased: stage.hadMobEffect(foe, "world_combat:status/encased"),
            changed: stage.changedBlocks().length,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "rock tomb lands within 60 s");
});
