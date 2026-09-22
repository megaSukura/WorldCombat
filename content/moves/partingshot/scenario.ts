/**
 * 抛下狠话 / partingshot 的可执行设计说明。
 *
 * 场面：只会抛下狠话的蛇纹熊（Zigzagoon，34 级，原生真实学习者）对五格外一只被钉住不动的僵尸（原版生物）。
 *   必然事实：本招被提交过（`stage.casts`）；目标被这句话羞辱（共享身份 `world_combat:status/parting_shot`）；
 *   施法者扎中后自己退开（`stage.travelled`）。
 * 削到几级、命中与否由实现与随机决定，写进 note 供读轨迹判断。真正的「和后备宝可梦替换」需要共享入口，
 * 本场景只验证可观察到的削级与退步（见报告共享前置）。
 */
Smoke.scenario("partingshot", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zigzagoon", level: 34, moves: ["partingshot"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:zombie,limit=1] {NoAI:1b}");
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("partingshot", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/parting_shot");
    }, function () {
        stage.expect(stage.casts("partingshot", caster) > 0, "parting shot was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/parting_shot"), "the barb humiliated the foe (shared identity)");
        stage.expect(stage.travelled(caster) > 0.3, "the user stepped away after the barb");
        stage.note("羞辱级数随特攻（话越毒），射程随等级，飞行速度随速度；毒舌默认关闭。话没扎中就不退。真正的后备宝可梦替换需要共享的入场／收回入口。", {
            casts: stage.casts("partingshot", caster),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            humiliated: stage.hadMobEffect(foe, "world_combat:status/parting_shot"),
            casterAlive: caster.alive(),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "parting shot lands the barb and steps away");
});
