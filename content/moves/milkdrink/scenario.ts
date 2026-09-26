/**
 * 喝牛奶 / Milk Drink —— 可执行设计说明。
 *
 * 一句话：掉血或中毒后仰头连饮，把回复分成几口交付，最后一口把毒冲掉；AI 在自身生命低于 ai.healBelow
 *   （默认 0.7）或身上带毒时动用，并且要有一段能连续喝完的窗口。所以场面要分别准备「掉血且中毒」与「满血只中毒」两种情形。
 *
 * 场面：晴天白天、开阔平地、附近没有敌人。只会喝牛奶的两只大奶罐（miltank，会学这招；技能表只给这一招）站在两侧：
 *   一只开局被一次性压到自身最大生命约 50% 并中毒；另一只保持满血、只给一段共享身份的中毒
 *   （minecraft:poison 带 world_combat:status/poison 标签），验证满血也会把这一轮喝完并解毒。
 *
 * 必然事实：两只都提交过喝牛奶；连饮走完后掉血的那只生命必定高于压血后的最低值；两只的中毒都在最后一口被
 *   CombatStatus.cure(world, self, "poison") 冲掉（中毒是完成奖励，只有真正喝完才触发）。口数、口间隔、奶滴与冲毒光晕
 *   取决于等级、速度、特攻、体重与身高，写进 note。
 */
Smoke.scenario("milkdrink", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var wounded = stage.pokemon({ species: "miltank", level: 44, moves: ["milkdrink"], at: [-3, 0, 0] });
    var full = stage.pokemon({ species: "miltank", level: 44, moves: ["milkdrink"], at: [3, 0, 0] });
    stage.team("milkdrink-check", [wounded, full]);

    var woundedAt = 0;
    stage.after(5, function () {
        var maximum = wounded.health();
        var at = wounded.position(), selector = "@e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest]";
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage " + selector + " " + Math.max(1, Math.round(maximum * 0.5)) + " minecraft:generic");
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give " + selector + " minecraft:poison 60 0");
        var fullAt = full.position();
        stage.command("execute positioned " + fullAt[0] + " " + fullAt[1] + " " + fullAt[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] minecraft:poison 60 0");
        stage.after(4, function () { woundedAt = wounded.health(); });
    });

    stage.until(900, function () {
        return stage.casts("milkdrink", wounded) >= 1 && stage.casts("milkdrink", full) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("milkdrink", wounded) >= 1, "the wounded, poisoned miltank drank below the threshold");
        stage.expect(stage.casts("milkdrink", full) >= 1, "the full-health, poisoned miltank still drank to cure itself");
        stage.after(120, function () {
            stage.expect(wounded.health() > woundedAt + 5, "the gulps paid health back above the wound floor");
            stage.expect(!stage.hasMobEffect(wounded, "world_combat:status/poison"), "the last gulp washed the wounded miltank's poison away");
            stage.expect(!stage.hasMobEffect(full, "world_combat:status/poison"), "the full-health miltank finished its drink and cured the poison");
            stage.note("喝牛奶把回复分成 gulps 口交付，每 gulpTicks 交付一口；每口都推一次饮用表现（真实喝下即出现），"
                + "只有真正喝完最后一口才 CombatStatus.cure(world, self, \"poison\") 冲掉任一来源的中毒——中途取消或被打断只保留已喝部分、不提前解毒。"
                + "本场景同时验证掉血连饮与「满血带毒也喝完解毒」。口数随等级、口间隔随速度、奶滴随体重、冲毒光晕随身高变化，留给完整装配的人工试玩核对。", {
                woundedCasts: stage.casts("milkdrink", wounded),
                fullCasts: stage.casts("milkdrink", full),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                woundedHealthNow: Math.round(wounded.health() * 10) / 10,
                fullHealthNow: Math.round(full.health() * 10) / 10,
                woundedPoisonedSeen: stage.hadMobEffect(wounded, "world_combat:status/poison"),
                woundedPoisonedNow: stage.hasMobEffect(wounded, "world_combat:status/poison"),
                fullPoisonedSeen: stage.hadMobEffect(full, "world_combat:status/poison"),
                fullPoisonedNow: stage.hasMobEffect(full, "world_combat:status/poison"),
                woundedAlive: wounded.alive(), fullAlive: full.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "both miltanks drink within 45 s");
});
