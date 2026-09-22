/**
 * 魅诱之声 / alluringvoice —— 可执行设计说明。
 *
 * 一句话：朝身前荡出一条天使般的锥形声场，伤害范围内所有敌人；此刻正带着正面能力等级的目标会被歌声惑乱、
 * 陷入混乱，出手可能作废、打中别人还会被自己的力量反噬。
 *
 * 场面：平坦石头地、白天。一只只会「魅诱之声」的 jigglypuff（技能表只给这一招）对上一只 snorlax。
 * 私有装配只装共享包与本单元，舞台里没有「自我强化」的招式实现，因此这里无法真的把目标垫高；
 * 本场景只核验必然发生的部分——声场唱出、伤害落到目标身上。惑乱条件（目标带着正面等级）与随之延长的
 * 混乱时长，需要目标真的处于强化状态，见 note 与报告里的试玩步骤。
 *
 * 断言只取必然事实：这招被放过、伤害落到目标身上。命中/暴击、伤害量、目标撑不撑得住、这次有没有
 * 惑乱（本场景无法垫高目标，预计为否），都随局面变化，写进 note。
 */
Smoke.scenario("alluringvoice", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var singer = stage.pokemon({ species: "jigglypuff", level: 30, moves: ["alluringvoice"], at: [-3, 0, 0] });
    var prey = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(singer, prey);
    stage.until(1200, function () {
        return stage.casts("alluringvoice", singer) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(8, function () {
            stage.expect(stage.casts("alluringvoice", singer) >= 1, "jigglypuff committed alluring voice");
            stage.expect(stage.damageTo(prey) > 0, "the cone of song damaged the target");
            stage.note("confusion only lands while the target carries positive stages, so an unboosted target just takes the song damage. This stage's private assembly has no self-boost move to raise the target, so the daze is expected to read false here; in real play it is exercised against a target that just boosted, where the confusion is guaranteed and lasts longer the more it raised. Variables: damage roll and crit, whether the target survives, the confusion length on a raised target, and whether the fumble gate triggers.", {
                casts: stage.casts("alluringvoice", singer),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyConfused: stage.hadMobEffect(prey, "world_combat:status/confusion")
            });
            stage.done();
        });
    }, "alluring voice damages the target within 60 s");
});
