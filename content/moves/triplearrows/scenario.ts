/**
 * 三连箭 / triplearrows —— 可执行设计说明。
 *
 * 一句话：先一记低扫腿踢开护架，紧接着三箭同时离弦打向目标。
 *
 * 场面：只会三连箭的狙射树枭（50 级）对一只厚血、站桩的卡比兽（50 级，只会跃起）出手；硬石地面，
 * 断言只取必然事实：这招被提交过、目标受到过伤害。踢开护架（50% 掷）与畏缩（30% 掷，只在第一次命中时）
 * 都是概率结果，是否触发写进 note 供读轨迹判断。
 */
Smoke.scenario("triplearrows", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "decidueye", level: 50, moves: ["triplearrows"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("triplearrows", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 12;
    }, function () {
        stage.expect(stage.casts("triplearrows", caster) >= 1, "caster committed triple arrows");
        stage.expect(stage.damageTo(foe) > 0, "triple arrows dealt damage to the foe");
        stage.note("the low kick only reaches close range, so a distant cast is arrows only; the guard break is a 50% roll on the kick and only the target it actually struck gets the crit; the flinch is a 30% roll on the first arrow to land", {
            casts: stage.casts("triplearrows", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            guardbroken: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "triple arrows land within 60 s");
});
