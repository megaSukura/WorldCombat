/**
 * 电力上升 / risingvoltage 的可执行设计说明。
 *
 * 场面：一只只会「电力上升」的 pikachu 对上一只耐打的 snorlax。为了让翻倍那一支成为**必然**，
 * 场景在开局直接给目标挂上电气场地的电荷身份 `world_combat:electricterrain_ground`
 * （共享身份 world_combat:status/electricterrain，由电气场地单元注册的效果承担；本场景把它作为依赖装配）。
 * 断言：这招被提交过、伤害落到了目标身上、目标当时带着电气场地的电荷身份。
 * 暴击、命中率、电流爬行时刻与最终是否翻倍后的具体伤害写进 note 供读轨迹判断。
 */
Smoke.scenario("risingvoltage", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "pikachu", level: 36, moves: ["risingvoltage"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    // 开局就把电气场地的电荷身份给站在场地中心的目标，让电柱的翻倍分支必然走到。
    stage.after(0, function () {
        stage.command("effect give @e[type=cobblemon:pokemon,distance=..3,limit=1,sort=nearest] world_combat:electricterrain_ground 600 0");
    });
    stage.until(900, function () {
        return stage.casts("risingvoltage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("risingvoltage", caster) > 0, "pikachu committed rising voltage");
        stage.expect(stage.damageTo(foe) > 0, "the rising column damaged the target");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/electricterrain"),
            "the charged target carried the shared electric-terrain identity, so the doubling branch applied");
        stage.note("the target was granted the electric-terrain charge, so its segment is doubled per target. Variables: hit chance, crit, and the exact crawl delay before the column rises.", {
            casts: stage.casts("risingvoltage", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            foeCharged: stage.hadMobEffect(foe, "world_combat:status/electricterrain"),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "rising voltage lands and doubles on the charged target within 45 s");
});
