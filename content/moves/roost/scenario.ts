/**
 * 羽栖 / Roost —— 可执行设计说明。
 *
 * 一句话：掉血后收翼落地，把回复分成几段在栖息窗口里交付；AI 只在自身生命低于 ai.healBelow（默认 0.65）时动用。
 *
 * 场面：晴天白天、开阔平地。只会羽栖的比雕（pidgeot，会学这招；技能表只给这一招）站在一侧，附近没有敌人。
 *   施术者开局被一次性压到自身最大生命约 50%，跨过落地阈值。
 *
 * 必然事实：施术者提交过羽栖；栖息窗口走完后生命必定高于压血后的最低值（没有被清除身份打断）。
 *   交付段数、栖息窗口、羽尘与气流取决于等级、速度、身高与体重，写进 note。
 */
Smoke.scenario("roost", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "pidgeot", level: 44, moves: ["roost"], at: [-3, 0, 0] });

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
        return stage.casts("roost", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("roost", caster) >= 1, "the wounded pidgeot settled down to roost below the threshold");
        // 栖息是分段交付，等整段走完再断言回复。
        stage.after(220, function () {
            stage.expect(caster.health() > woundedAt + 5, "the roost paid its portions back to the caster");
            stage.note("羽栖把回复分成 chunks 段在栖息窗口里交付；落地时给自己挂共享身份 world_combat:status/roosting，并失去飞行属性（宝可梦走 NativeModifiers，纯飞行或没有飞行的对象不动）。清掉身份（牛奶／/effect clear）会提前收尾、只拿已交付的部分；本场景不打断，全部交付。交付段数随等级、栖息窗口随速度、羽尘随身高、气流与羽风范围随体重与身高变化，留给完整装配的人工试玩核对。", {
                casterCasts: stage.casts("roost", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                roostingSeen: stage.hadMobEffect(caster, "world_combat:status/roosting"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "roost is cast below the threshold within 45 s");
});
