/**
 * 自我再生 / Recover —— 可执行设计说明。
 *
 * 一句话：掉血后启动再生，在约两秒的窗口里按刻把生命补回来，且不锁足；AI 只在自身生命低于 ai.healBelow
 *   （默认 0.7）时才动用。所以场面必须先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会自我再生的多边兽（porygon，会学这招；技能表只给这一招）站在一侧，附近没有敌人。
 *   施术者开局被一次性压到自身最大生命约 50%。
 *
 * 必然事实：施术者提交过自我再生；再生窗口走完后生命必定高于压血后的最低值（身份没有被清除打断）。
 *   回复比例、窗口长度、光点与光晕范围取决于等级、速度、伤势深度与体重，写进 note。
 */
Smoke.scenario("recover", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "porygon", level: 44, moves: ["recover"], at: [-3, 0, 0] });

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
        return stage.casts("recover", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("recover", caster) >= 1, "the wounded porygon started regenerating below the threshold");
        stage.after(160, function () {
            stage.expect(caster.health() > woundedAt + 5, "the regeneration paid health back above the wound floor");
            stage.note("自我再生把回复摊在 restoreTicks 窗口里按刻交付；窗口内可以继续走位（不锁足），生命补满会提前收势。伤得越重 cell 干得越猛（伤势深度项）、等级越高底子越厚。窗口里给自己挂共享身份 world_combat:status/regenerating；清掉身份（牛奶／/effect clear）会提前收尾、只拿已交付的部分。本场景不打断，整段走完。回复比例、窗口、光点数与光晕范围留给完整装配的人工试玩核对。", {
                casterCasts: stage.casts("recover", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                regeneratingSeen: stage.hadMobEffect(caster, "world_combat:status/regenerating"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "recover is cast below the threshold within 45 s");
});
