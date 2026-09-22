/**
 * 喝牛奶 / Milk Drink —— 可执行设计说明。
 *
 * 一句话：掉血或中毒后仰头连饮，把回复分成几口交付，最后一口把毒冲掉；AI 在自身生命低于 ai.healBelow
 *   （默认 0.7）或身上带毒时动用。
 *
 * 场面：晴天白天、开阔平地。只会喝牛奶的大奶罐（miltank，会学这招；技能表只给这一招）站在一侧，附近没有敌人。
 *   施术者开局被一次性压到自身最大生命约 50%，并施加一段共享身份的中毒（minecraft:poison 带
 *   world_combat:status/poison 标签），让连饮的解毒一幕有实际结果。
 *
 * 必然事实：施术者提交过喝牛奶；连饮走完后生命必定高于压血后的最低值。中毒在最后一口被
 *   CombatStatus.cure(world, self, "poison") 冲掉——这是这招区别于同族的收益，写进断言。
 *   口数、口间隔、奶滴与冲毒光晕取决于等级、速度、特攻、体重与身高，写进 note。
 */
Smoke.scenario("milkdrink", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "miltank", level: 44, moves: ["milkdrink"], at: [-3, 0, 0] });

    var woundedAt = 0;
    stage.after(5, function () {
        var maximum = caster.health();
        var at = caster.position();
        var selector = "@e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest]";
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage " + selector + " " + Math.max(1, Math.round(maximum * 0.5)) + " minecraft:generic");
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give " + selector + " minecraft:poison 60 0");
        stage.after(4, function () { woundedAt = caster.health(); });
    });

    stage.until(900, function () {
        return stage.casts("milkdrink", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("milkdrink", caster) >= 1, "the wounded, poisoned miltank drank below the threshold");
        stage.after(100, function () {
            stage.expect(caster.health() > woundedAt + 5, "the gulps paid health back above the wound floor");
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/poison"), "the last gulp washed the poison away");
            stage.note("喝牛奶把回复分成 gulps 口交付，每 gulpTicks 交付一口；最后一口 CombatStatus.cure(world, self, \"poison\") 冲掉任一来源的中毒（本场景用 /effect give minecraft:poison，该效果带 world_combat:status/poison 标签）。口数随等级、口间隔随速度、奶滴随体重、冲毒光晕随身高变化，留给完整装配的人工试玩核对。", {
                casterCasts: stage.casts("milkdrink", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                poisonedSeen: stage.hadMobEffect(caster, "world_combat:status/poison"),
                poisonedNow: stage.hasMobEffect(caster, "world_combat:status/poison"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "milk drink is cast below the threshold within 45 s");
});
