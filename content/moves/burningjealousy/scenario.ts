/**
 * 妒火 / burningjealousy —— 可执行设计说明。
 *
 * 一句话：从身前窜出一团妒绿火舌扫过扇形，烧痛范围内所有敌人；此刻正带着正面能力等级的目标会被咬住、
 * 当场灼伤，而且它涨高的级数越多，这一击越重、烧得越久。
 *
 * 场面：平坦石头地、白天。一只只会「妒火」的 charmander（技能表只给这一招）对上一只 snorlax。
 * 私有装配只装共享包与本单元，舞台里没有「自我强化」的招式实现，因此这里无法真的把目标垫高；
 * 本场景只核验必然发生的部分——火舌扫出、伤害落到目标身上。点燃条件（目标带着正面等级）与随之加重的
 * 伤害、延长的灼伤，需要目标真的处于强化状态，见 note 与报告里的试玩步骤。
 *
 * 断言只取必然事实：这招被放过、伤害落到目标身上。命中/暴击、伤害量、目标撑不撑得住、这次有没有
 * 点燃（本场景无法垫高目标，预计为否），都随局面变化，写进 note。
 */
Smoke.scenario("burningjealousy", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "charmander", level: 30, moves: ["burningjealousy"], at: [-3, 0, 0] });
    var prey = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, prey);
    stage.until(1200, function () {
        return stage.casts("burningjealousy", caster) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("burningjealousy", caster) >= 1, "charmander committed burning jealousy");
            stage.expect(stage.damageTo(prey) > 0, "the fan of flame damaged the target");
            stage.note("the burn only lands while the target carries positive stages, so an unboosted target just takes the fire damage. This stage's private assembly has no self-boost move to raise the target, so the ignition is expected to read false here; in real play it is exercised against a target that just boosted, where the burn is guaranteed and lasts longer the more it raised. Variables: damage roll and crit, whether the target survives, and the burn length on a raised target.", {
                casts: stage.casts("burningjealousy", caster),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyBurn: stage.hadMobEffect(prey, "world_combat:status/burn")
            });
            stage.done();
        });
    }, "burning jealousy damages the target within 60 s");
});
