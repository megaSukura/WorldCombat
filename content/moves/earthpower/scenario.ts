/**
 * 大地之力 / earthpower —— 可执行设计说明。
 *
 * 一句话：让会这一招的精灵对一名站在石地上的睡眠对手掀地，验证它提交并命中、造成伤害。
 *
 * 场面：只会大地之力的尼多王对一只睡眠的拉达（敌对生物）出手；硬石平地。断言只取必然事实：
 * 这招被提交过、站在真实支撑面上的目标受到过伤害。离地目标不挨打（原生 nonsky）是设计事实，本场景只摆
 * 地上目标；碾防（约 10% 起）、暴击、被顶多高、碎土数与标记位置都写进 note 供读轨迹判断。
 */
Smoke.scenario("earthpower", function (stage) {
    stage.fill([-8, -1, -6], [10, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "nidoking", level: 36, moves: ["earthpower"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, target);
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("earthpower", caster) > 0 && stage.damageTo(target) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 10;
    }, function () {
        stage.expect(stage.casts("earthpower", caster) > 0, "earthpower was committed");
        stage.expect(stage.damageTo(target) > 0, "the surge damaged the grounded target on the same support surface");
        stage.note("the surge locks the real support surface under the target and only catches foes on that surface; the passive Sp. Def roll (about 10% base), crit, how high the target was launched and the mark position are random/positional; airborne foes take nothing by design (native nonsky)", {
            casts: stage.casts("earthpower", caster),
            damage: Math.round(stage.damageTo(target) * 10) / 10,
            targetTravelled: Math.round(stage.travelled(target) * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "earthpower erupts under the target within 60 s");
});
