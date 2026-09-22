/**
 * 晨光 / Morning Sun —— 可执行设计说明。
 *
 * 一句话：白天晴空下把日光拽到身上，接住时回一大口并获得一段加速；AI 在生命低于 ai.healBelow（默认 0.7）、
 *   且 ai.waitForSky（默认开）下日光够强（context.facts.sunlight ≥ 0.8）时才动用。所以场面要白天晴空、并把施术者压到阈值以下。
 *
 * 场面：晴天白天、开阔平地。只会晨光的太阳伊布（espeon，会学这招；技能表只给这一招）站在一侧；附近没有敌人。
 *   施术者在开局被一次性压到自身最大生命约 55%（单次 /damage，避免持续补刀把回复掩盖掉）。
 *
 * 必然事实：施术者提交过晨光；白天晴空下 dawn=1，回复立即结算并施加 minecraft:speed，因此结算后生命必定高于
 *   压血后的最低值、且移动速度属性高于施放前。夜里或阴雨只会回下限、不给加速，写进 note。
 */
Smoke.scenario("morningsun", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "espeon", level: 30, moves: ["morningsun"], at: [-3, 0, 0] });
    var speedBefore = stage.attribute(caster, "minecraft:generic.movement_speed");

    // 一次性压到约 45%，记录压血后的最低值；之后不再补刀，让回复稳定结算。
    var woundedAt = 0;
    stage.after(5, function () {
        var maximum = caster.health();
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.55)) + " minecraft:generic");
        stage.after(4, function () { woundedAt = caster.health(); });
    });

    stage.until(800, function () {
        return stage.casts("morningsun", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("morningsun", caster) >= 1, "the wounded espeon caught the morning light below its threshold");
        stage.after(20, function () {
            stage.expect(caster.health() > woundedAt + 5, "the morning light was restored as health above the wound floor");
            stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") > speedBefore, "the clear-day cast granted the morning vigour speed boost");
            stage.note("晨光可及（白天 × 可见天空 × 无雨）是二值读数：晴天天亮为 1，回复约最大生命的 2/3 并施加 minecraft:speed；夜里与阴雨为 0，只回约 1/4、也没有加速。回复比例随特攻增长（太阳伊布特攻偏高），加速时长随速度增长（60-180 刻）。这里在施放后 20 刻读数，加速仍在窗口内。", {
                casterCasts: stage.casts("morningsun", caster),
                speedBefore: Math.round(speedBefore * 1000) / 1000,
                speedNow: Math.round(stage.attribute(caster, "minecraft:generic.movement_speed") * 1000) / 1000,
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "morning sun is cast below the heal threshold under clear day within 40 s");
});
