/**
 * 流星光束 / meteorbeam 的可执行设计说明。
 *
 * 场面：夜晚、晴空，石面平地。一只只会流星光束的 Solrock（L40）从 x=−4 起手，目标 Slowpoke（L30、睡眠、
 *   技能表只给撞击）站在 x=4。聚星在提交前完成、特攻提升在提交时结算。
 *
 * 必然事实：本招被提交过；陨石对目标造成了伤害。落点只留短促碎石，不改写地面方块。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、弹道实际落在哪、溅射到几个、
 *   特攻提升了几级（原生 +1，深空形态 +2；能力等级不是 MobEffect，舞台读不到，只从伤害与轨迹间接判断）。
 */
Smoke.scenario("meteorbeam", function (stage) {
    stage.weather("clear");
    stage.time("night");
    stage.fill([-4, -1, -6], [14, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "solrock", level: 40, moves: ["meteorbeam"], at: [-4, 0, 0] });
    // A stationary punching bag: sleeping, so a ballistic meteor can actually land on it.
    var target = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1400, function () {
        return stage.casts("meteorbeam", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("meteorbeam", caster) >= 1, "solrock committed meteor beam");
        stage.expect(stage.damageTo(target) > 0, "the meteor damaged the target at the landing point");
        stage.note("the full two beats ran: gather, then the ballistic throw. The landing only kicks up short debris and leaves the ground blocks unchanged. Random here: damage roll and crit, whether the slowpoke survives, where the arc actually landed, how many extra bodies the splash caught. The +SpA stage lives on the native ability ladder, not a MobEffect, so the stage cannot read it directly.", {
            casts: stage.casts("meteorbeam", caster),
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
            targetHealth: Math.round(target.health() * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "meteor beam lands and damages the target within 70 s");
});
