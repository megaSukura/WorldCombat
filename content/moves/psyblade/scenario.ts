/**
 * 精神剑 / psyblade 的可执行设计说明。
 *
 * 场面：一只只会「精神剑」的 gallade 对上一只耐打的 snorlax，目标放在 5 格外逼出一段压上，用来走到
 *   「压上 → 沿瞄准方向刺出一条窄直线 → 命中」这条必然路径。
 * 断言只取必然事实：这招被提交过、伤害落到了目标身上。带电时「×1.5 并沿同线延长」的分支不在本私有装配里强制：
 *   电气场地的电荷身份 `world_combat:electricterrain_ground` 由电气场地单元注册，本装配不含它，所以加成按参数
 *   公式在单元检查里覆盖，实际观感与条件留给完整装配人工试玩。暴击、命中率、压上距离写进 note 供读轨迹判断。
 */
Smoke.scenario("psyblade", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "gallade", level: 40, moves: ["psyblade"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("psyblade", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psyblade", caster) > 0, "gallade committed psyblade");
        stage.expect(stage.damageTo(foe) > 0, "the blade cut the target");
        stage.note("the blade is a narrow straight line now, not a sweep; a solid wall truncates it. The x1.5 charged extension is not staged here because the private assembly does not register world_combat:electricterrain_ground; it is covered by the parameter formula. Variables: hit chance, crit, how far the dash closed, and whether the target survives.", {
            casts: stage.casts("psyblade", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "psyblade lands within 45 s");
});
