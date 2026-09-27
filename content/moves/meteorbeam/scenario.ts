/**
 * 流星光束 / meteorbeam 的可执行设计说明。
 *
 * 场面：夜晚、晴空，石面平地。一只只会流星光束的 Solrock（L45）从 x=−4 起手，两个静止的 Slowpoke（L30、睡眠、
 *   技能表只给撞击）并排站在 x≈4，距离都在落点半径内。聚星在提交前完成、特攻提升在提交时结算。
 *
 * 必然事实：本招被提交过；陨石与落点把两个目标都覆盖到（正面独立结算 + 落点半径内可直达的溅射）；
 *   落地只留短促碎石，不改写地面方块。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、弹道实际落在哪、谁是正面命中谁是溅射、
 *   特攻提升了几级（原生 +1，深空形态 +2；能力等级不是 MobEffect，舞台读不到）。
 */
Smoke.scenario("meteorbeam", function (stage) {
    stage.weather("clear");
    stage.time("night");
    stage.fill([-4, -1, -4], [10, -1, 4], "minecraft:stone");
    stage.watch([-4, 0, -4], [10, 2, 4]);
    var caster = stage.pokemon({ species: "solrock", level: 45, moves: ["meteorbeam"], at: [-4, 0, 0] });
    // Two stationary punching bags close enough that the landing radius covers both.
    var near = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    var side = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4.6, 0, 0.9] });
    stage.noai(near, side);
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.until(1400, function () {
        return stage.casts("meteorbeam", caster) >= 1 && stage.damageTo(near) > 0 && stage.damageTo(side) > 0;
    }, function () {
        stage.expect(stage.casts("meteorbeam", caster) >= 1, "solrock committed meteor beam");
        stage.expect(stage.damageTo(near) > 0 && stage.damageTo(side) > 0, "the meteor covered both bodies at the landing");
        stage.expect(stage.changedBlocks().length === 0, "the landing left the ground blocks unchanged");
        stage.note("The arc was solved and checked before commit, so the two beats ran: gather, then the ballistic throw. Landing only kicks up short debris and leaves the ground blocks unchanged. Random here: damage roll and crit, whether each slowpoke survives, where the arc actually landed, which body took the head-on hit and which took the splash. The +SpA stage lives on the native ability ladder, not a MobEffect, so the stage cannot read it directly.", {
            casts: stage.casts("meteorbeam", caster),
            damageToNear: Math.round(stage.damageTo(near) * 10) / 10,
            damageToSide: Math.round(stage.damageTo(side) * 10) / 10,
            changedBlocks: stage.changedBlocks().length,
            nearAlive: near.alive(),
            sideAlive: side.alive()
        });
        stage.done();
    }, "meteor beam lands and covers both bodies within 70 s");
});
