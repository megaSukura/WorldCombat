/**
 * 生蛋 / Soft-Boiled —— 可执行设计说明。
 *
 * 一句话：掉血后产下一枚带着回复的蛋，片刻后啄开回复自己；AI 只在自身生命低于 ai.healBelow（默认 0.65）时动用。
 *   所以场面必须先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会生蛋的吉利蛋（chansey，会学这招；技能表只给这一招）站在一侧，附近没有敌人
 *   （蛋不会被敌人打碎，也不会误把蛋递给别人）。施术者开局被一次性压到自身最大生命约 50%。
 *
 * 必然事实：施术者提交过生蛋；蛋在孵化延迟后啄开，因此等待足够时间后生命必定高于压血后的最低值。
 *   回复比例、孵化延迟、蛋壳与守候微光取决于等级、速度、亲密度、特防与体型，写进 note。
 */
Smoke.scenario("softboiled", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "chansey", level: 44, moves: ["softboiled"], at: [-3, 0, 0] });

    var woundedAt = 0;
    stage.after(5, function () {
        var maximum = caster.health();
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.5)) + " minecraft:generic");
        stage.after(4, function () { woundedAt = caster.health(); });
    });

    stage.until(900, function () {
        return stage.casts("softboiled", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("softboiled", caster) >= 1, "the wounded chansey laid an egg below the threshold");
        stage.after(140, function () {
            stage.expect(caster.health() > woundedAt + 5, "the egg hatched and paid the heal back above the wound floor");
            stage.note("生蛋把回复外化成一只 WorldBodies 持久实体（脑 world_combat:move/softboiled/egg，外观 minecraft:egg）：蛋在 eatTicks 后啄开并把回复交给受益人（默认自己，分蛋档是事先选定的受伤友方）。蛋在孵化前 health 为 6、非无敌，敌人可以打碎它（smashed，没有这一口）；受益人已满血或离场则 wasted。本场景附近没有敌人，蛋未被击碎。回复比例随亲密度与特防增长、孵化延迟随等级缩短、碎片与守候微光随体重与身高变化，留给完整装配的人工试玩核对。", {
                casterCasts: stage.casts("softboiled", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "soft-boiled is cast below the threshold within 45 s");
});
