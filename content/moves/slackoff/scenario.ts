/**
 * 偷懒 / Slack Off —— 可执行设计说明。
 *
 * 一句话：掉血后就地一摊，立刻补一大口，随后进入一段「倦怠」（移动变慢）；AI 只在自身生命低于 ai.healBelow
 *   （默认 0.6）、且此刻不在倦怠里时才动用。所以场面要先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会偷懒的呆壳兽（slowbro，会学这招；技能表只给这一招）站在一侧，附近没有敌人。
 *   施术者开局被一次性压到自身最大生命约 45%。
 *
 * 必然事实：施术者提交过偷懒；提交后生命立即高于压血后的最低值，并且身上出现过共享身份
 *   world_combat:status/loafing（这是它区别于同族的代价）。倦怠时长、尘土与气泡取决于体型与体重，写进 note。
 */
Smoke.scenario("slackoff", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "slowbro", level: 44, moves: ["slackoff"], at: [-3, 0, 0] });

    var woundedAt = 0;
    stage.after(5, function () {
        var maximum = caster.health();
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.45)) + " minecraft:generic");
        stage.after(4, function () { woundedAt = caster.health(); });
    });

    stage.until(900, function () {
        return stage.casts("slackoff", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("slackoff", caster) >= 1, "the wounded slowbro slumped down below the threshold");
        stage.after(60, function () {
            stage.expect(caster.health() > woundedAt + 5, "the nap paid a lump of health back above the wound floor");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/loafing"), "the nap left the caster loafing (slowed)");
            stage.note("偷懒是同族里起手最快的一口：提交即结算，随后挂上 world_combat:loafing（带原生 movement_speed 负修饰）。倦怠时长随体重增长、酣睡档 ×1.4；尘土与气泡数也随体重增长。起身一幕由效果到期移除事件补播。回复比例、倦怠时长与画面密度留给完整装配的人工试玩核对。", {
                casterCasts: stage.casts("slackoff", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                loafingSeen: stage.hadMobEffect(caster, "world_combat:status/loafing"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "slack off is cast below the threshold within 45 s");
});
