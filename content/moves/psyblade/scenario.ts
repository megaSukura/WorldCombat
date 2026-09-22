/**
 * 精神剑 / psyblade 的可执行设计说明。
 *
 * 场面：一只只会「精神剑」的 gallade 站在场地中心，开局就被挂上电气场地的电荷身份
 *   `world_combat:electricterrain_ground`（共享身份 world_combat:status/electricterrain，由电气场地单元注册的效果承担；
 *   本场景把它作为依赖装配）。目标是一只耐打的 snorlax，放在 5 格外逼出一段压上。
 * 断言：这招被提交过、伤害落到了目标身上、施法者当时带着电气场地的电荷身份（×1.5 的分支）。
 * 暴击、命中率、压上的距离与最终是否还活着写进 note 供读轨迹判断。
 */
Smoke.scenario("psyblade", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "gallade", level: 40, moves: ["psyblade"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    // 开局就给站在场地中心的施法者挂上电气场地的电荷身份，让 ×1.5 的分支必然走到。
    stage.after(0, function () {
        stage.command("effect give @e[type=cobblemon:pokemon,distance=..3,limit=1,sort=nearest] world_combat:electricterrain_ground 600 0");
    });
    stage.until(900, function () {
        return stage.casts("psyblade", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psyblade", caster) > 0, "gallade committed psyblade");
        stage.expect(stage.damageTo(foe) > 0, "the blade cut the target");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/electricterrain"),
            "the caster stood on the shared electric-terrain charge, so the x1.5 branch applied");
        stage.note("the caster was granted the electric-terrain charge, so its segment is x1.5. Variables: hit chance, crit, how far the dash closed, whether the graze cap was reached, and whether the target survives.", {
            casts: stage.casts("psyblade", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterCharged: stage.hadMobEffect(caster, "world_combat:status/electricterrain"),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "psyblade lands and is boosted on the charged caster within 45 s");
});
