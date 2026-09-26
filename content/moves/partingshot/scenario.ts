/**
 * 抛下狠话 / partingshot 的可执行设计说明。
 *
 * 场面：只会抛下狠话的蛇纹熊（Zigzagoon，34 级，原生真实学习者）对五格外一只被钉住不动的僵尸（原版生物）。
 *   选取是 `kind: "aim"`，可以空放；这里由 AI 按仇恨推荐这只僵尸。
 *   必然事实：本招被提交过（`stage.casts`）；话扎中后目标被羞辱（共享身份 `world_combat:status/parting_shot`）；
 *   没有后备队伍时施法者沿实际脚步退开（`stage.travelled`）。
 * 削到几级、命中与否由实现与随机决定，写进 note 供读轨迹判断。有后备时的真实换手（partySwitchOut）与
 * 墙上被挡不白退由用户试玩与源码验收；本场景的野生施法者没有后备，验证无后备的逐刻退步。
 */
Smoke.scenario("partingshot", function (stage) {
    stage.fill([-12, -1, -12], [12, -1, 12], "minecraft:stone");
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
        stage.after(60, function () {
            stage.expect(stage.travelled(caster) > 0.3, "without a reserve the user stepped away on its own feet");
            stage.note("羞辱级数随特攻（话越毒），射程随等级，飞行速度随速度；毒舌默认关闭。命中后：有合法后备则 partySwitchOut 在同一点换手，无后备则沿背离方向逐刻后退、撞墙即停；墙上被挡或空放都不削级也不退。本场景野生施法者无后备。", {
                casts: stage.casts("partingshot", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                humiliated: stage.hadMobEffect(foe, "world_combat:status/parting_shot"),
                casterAlive: caster.alive(),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "parting shot lands the barb and steps away");
});
