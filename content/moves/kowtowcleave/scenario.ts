/**
 * 仆刀 / kowtowcleave —— 可执行设计说明。
 *
 * 一句话：先跪拜给目标开一道空门，再欺身一刀劈下，劈的是空门，所以必中。
 *
 * 场面：一只仆刀将军对一只三格外的对手（贴身距离，让跪拜骗得到防）；场地铺平，夜晚避免日光环境伤害干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过仆刀伤害。空门是否在劈砍那一刻仍挂着、暴击与击退写进 note。
 */
Smoke.scenario("kowtowcleave", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kingambit", level: 42, moves: ["kowtowcleave"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "raticate", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("kowtowcleave", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("kowtowcleave", caster) >= 1, "caster committed kowtow cleave");
            stage.expect(stage.damageTo(foe) > 0, "kowtow cleave dealt damage to the foe");
            stage.note("whether the opening was open at the cut, plus crit and knockback, are positional/random", {
                casts: stage.casts("kowtowcleave", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                opened: stage.hadMobEffect(foe, "world_combat:status/dropguard"),
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "kowtow cleave lands within 60 s");
});
