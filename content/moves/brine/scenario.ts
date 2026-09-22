/**
 * 盐水 / brine 的可执行设计说明。
 *
 * 场面：一只只会「盐水」的 pelipper 对上一只脆皮的 rattata——目标会被第一发打到半血以下，第二发正落在
 *   残血身上，于是残血翻倍那一支必然被走到。
 * 断言只取必然事实：这招被提交过、伤害落到了目标身上、命中即浇上共享身份 world_combat:status/soaked 的
 *   湿透；并且等到第二发（打在残血目标上的那一发）也结算完成。暴击与两发各自的伤害写进 note 供读轨迹判断。
 */
Smoke.scenario("brine", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "pelipper", level: 35, moves: ["brine"], at: [-5, 0, 0] });
    var prey = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, prey);
    stage.until(1200, function () {
        return stage.casts("brine", caster) > 0 && stage.damageTo(prey) > 0
            && stage.hadMobEffect(prey, "world_combat:status/soaked");
    }, function () {
        var firstHit = stage.damageTo(prey);
        // 第一发之后目标已在半血以下；等第二发真的也结算完，翻倍那一支才算走过。
        stage.until(900, function () {
            return stage.casts("brine", caster) >= 2 && stage.damageTo(prey) > firstHit + 0.01;
        }, function () {
            stage.expect(stage.casts("brine", caster) >= 2, "pelipper committed brine at least twice, the second time at a wounded target");
            stage.expect(stage.damageTo(prey) > firstHit, "the wounded follow-up landed");
            stage.expect(stage.hadMobEffect(prey, "world_combat:status/soaked"), "the jet soaked the target through the shared identity");
            stage.note("brine doubles only while the target is at half HP or less. The weak target drops below half on the first hit, so the second cast is the doubled branch (its landed damage is the increase over the first-hit total). Variables: hit chance, crit, whether it survives, and the exact soak duration.", {
                casts: stage.casts("brine", caster),
                firstHit: Math.round(firstHit * 10) / 10,
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                followUp: Math.round((stage.damageTo(prey) - firstHit) * 10) / 10,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preySoaked: stage.hadMobEffect(prey, "world_combat:status/soaked")
            });
            stage.done();
        }, "the wounded follow-up lands within 45 s");
    }, "brine lands and soaks within 60 s");
});
