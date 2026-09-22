/**
 * 日光刃 / solarblade 的可执行设计说明。
 *
 * 场面：正午、晴空（强日光，所以走「跳过凝刃、当场斩出」这一幕），石面平地。
 *   一只只会日光刃的 Lurantis（L45）与目标 Squirtle（L30、睡眠、技能表只给撞击）只隔 2.5 格，
 *   已经在刀程以内，不必先接近——这样「强日光让凝刃为 0」能从提交发生在开战后的极短时间里读出来。
 *
 * 必然事实：本招被提交过；刀锋对目标造成了伤害；开战到提交的间隔很短（没有凝刃那段站桩），
 *   与同族日光束在夜里的场景（必须站定聚光）互为对照。
 *
 * 随机量写进 note：单次伤害与暴击、目标撑不撑得住、这一刀扫到几个、实际突进与推开多远。
 *   夜里要站定凝刃的那一幕由同族的日光束场景覆盖。
 */
Smoke.scenario("solarblade", function (stage) {
    stage.weather("clear");
    stage.time("noon");
    var caster = stage.pokemon({ species: "lurantis", level: 45, moves: ["solarblade"], at: [-2, 0, 0] });
    // A stationary punching bag: sleeping, so it stays in the arc while the caster cuts.
    var target = stage.pokemon({ species: "squirtle", level: 30, moves: ["tackle"], status: "sleep", at: [0.5, 0, 0] });
    stage.hostile(caster, target);
    var hostileAt = stage.tick(), committedAt = -1;
    stage.until(1200, function () {
        if (committedAt < 0 && stage.casts("solarblade", caster) >= 1) committedAt = stage.tick();
        return stage.casts("solarblade", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("solarblade", caster) >= 1, "lurantis committed solar blade");
        stage.expect(stage.damageTo(target) > 0, "the cut damaged the target in the arc");
        // Strong sunlight skips the gather: commit must follow the start almost at once (a gather would add ~21 ticks).
        stage.expect(committedAt - hostileAt <= 14, "the cut came at once in strong sunlight (no gathering)");
        stage.note("noon clear weather means no gathering: the cut landed right after commit. Random here: damage roll and crit, whether the squirtle survives, how many targets the arc caught, how far the step and the shove actually moved. The night gather branch is covered by the solarbeam scenario.", {
            casts: stage.casts("solarblade", caster),
            ticksToCommit: committedAt - hostileAt,
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            targetTravelled: Math.round(stage.travelled(target) * 10) / 10,
            targetHealth: Math.round(target.health() * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "solar blade cuts the target within 60 s");
});
