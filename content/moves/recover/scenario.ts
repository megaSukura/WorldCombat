/**
 * 自我再生 / Recover —— 可执行设计说明。
 *
 * 一句话：掉血后启动再生，在一段窗口里按刻把生命补回来，且不锁足、可边走边修；但它是主动恢复——
 *   清掉再生身份（或开始新的出手／被打断）时，剩余未交付的部分立刻丢掉，已经补进去的生命保留。
 *   AI 只在自身生命低于 ai.healBelow（默认 0.7）且有一段可走位的短窗口时才动用。所以场面必须先把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地、附近没有敌人。只会自我再生的多边兽（porygon，会学这招；技能表只给这一招）站在一侧。
 *   施术者开局被一次性压到自身最大生命约 50%；再生开始一小段后，用 /effect clear 清掉共享身份
 *   world_combat:regenerating。
 *
 * 必然事实：施术者提交过自我再生；清掉身份前已经真实补进过生命（已交付保留）；清掉身份后生命不再上升
 *   （剩余再生被掐断，不是后台水环）。回复比例、窗口长度、光点与光晕范围取决于等级、速度、伤势深度与体重，写进 note。
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
        var deliveredAt = 0;
        stage.after(12, function () {
            deliveredAt = caster.health();
            // 手动清掉共享身份：剩余再生应当立刻停掉，只留已交付的部分。
            var at = caster.position();
            stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                + " run effect clear @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:regenerating");
            var clearedAt = 0;
            stage.after(2, function () {
                clearedAt = caster.health();
                stage.after(70, function () {
                    stage.expect(deliveredAt > woundedAt, "the active regeneration delivered health before it was cut");
                    stage.expect(caster.health() <= clearedAt + 0.01, "clearing the regenerating identity stopped the remaining healing");
                    stage.expect(!stage.hasMobEffect(caster, "world_combat:status/regenerating"), "the cleared regenerating identity is gone");
                    stage.note("自我再生把回复摊在 restoreTicks 窗口里按刻交付；窗口内可以继续走位（不锁足），生命补满会提前收势。"
                        + "清掉共享身份（牛奶／/effect clear）、被打断，或开始新的出手，都会立刻掐断剩余再生，只留已交付的部分——它不会转成后台水环。"
                        + "本场景先让它补进一段，再用 /effect clear 验证「停掉就没有剩余治疗」。回复比例、窗口、光点数与光晕范围留给完整装配的人工试玩核对。", {
                        casterCasts: stage.casts("recover", caster),
                        woundedHealth: Math.round(woundedAt * 10) / 10,
                        deliveredHealth: Math.round(deliveredAt * 10) / 10,
                        clearedHealth: Math.round(clearedAt * 10) / 10,
                        casterHealthNow: Math.round(caster.health() * 10) / 10,
                        regeneratingSeen: stage.hadMobEffect(caster, "world_combat:status/regenerating"),
                        casterAlive: caster.alive(),
                        tick: stage.tick()
                    });
                    stage.done();
                });
            });
        });
    }, "recover is cast below the threshold within 45 s");
});
