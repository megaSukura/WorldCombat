/**
 * 妒火 / burningjealousy —— 可执行设计说明。
 *
 * 一句话：从身前窜出一团妒绿火舌扫过扇形，烧痛范围内所有敌人；此刻正带着正面能力等级的目标会被咬住、
 * 当场灼伤，而且它涨高的级数越多，这一击越重、烧得越久。
 *
 * 场面：平坦石头地、白天。一只只会「妒火」的 charmander（技能表只给这一招）对上一只被垫高的 snorlax
 * （`stage.boost` 直接给它两级物攻，模拟刚强化过的目标）。这样点燃条件是真的满足的，灼伤是必然结果。
 *
 * 断言只取必然事实：这招被放过、伤害落到目标身上、带着正面等级的目标被灼伤。命中/暴击、伤害量、
 * 目标撑不撑得住、灼伤具体烧多久，都随局面变化，写进 note。
 */
Smoke.scenario("burningjealousy", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "charmander", level: 30, moves: ["burningjealousy"], at: [-3, 0, 0] });
    var prey = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, prey);
    // A freshly raised target: real positive stages installed after actor binding, so the jealous flame is guaranteed to bite and burn.
    stage.after(3, function () { stage.boost(prey, { atk: 2 }); });
    stage.until(1200, function () {
        return stage.casts("burningjealousy", caster) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("burningjealousy", caster) >= 1, "charmander committed burning jealousy");
            stage.expect(stage.damageTo(prey) > 0, "the fan of flame damaged the target");
            stage.expect(stage.hadMobEffect(prey, "world_combat:status/burn"), "the raised target was set alight");
            stage.note("the burn lands only while the target carries positive stages; here the stage raised it two attack stages, so the ignition is expected. The extra power and longer burn scale with those stages. Variables: damage roll and crit, whether the target survives, and the exact burn length.", {
                casts: stage.casts("burningjealousy", caster),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyBurn: stage.hadMobEffect(prey, "world_combat:status/burn"),
                preyStages: stage.stages(prey)
            });
            stage.done();
        });
    }, "burning jealousy damages the target within 60 s");
});
