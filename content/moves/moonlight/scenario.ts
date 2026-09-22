/**
 * 月光 / Moonlight —— 可执行设计说明。
 *
 * 一句话：夜里晴空下把月色披到身上，接住时回一大口并冷却掉灼伤；AI 在生命低于 ai.healBelow（默认 0.7）、
 *   且 ai.waitForSky（默认开）下处于暗处（context.facts.sunlight ≤ 0.2）时才动用。所以场面要夜晚晴空、并把施术者压到阈值以下。
 *
 * 场面：夜晚、晴天、开阔平地。只会月光的皮皮（clefairy，会学这招；技能表只给这一招）站在一侧；附近没有敌人。
 *   施术者在开局被一次性压到自身最大生命约 55%（单次 /damage，避免持续补刀把回复掩盖掉）。
 *
 * 必然事实：施术者提交过月光；夜里晴空下 moon=1，回复立即结算，因此结算后生命必定高于压血后的最低值。灼伤冷却
 *   只在身上真有灼伤时才有可观察结果（本场景先不施加灼伤），写进 note。
 */
Smoke.scenario("moonlight", function (stage) {
    stage.weather("clear");
    stage.time("night");

    var caster = stage.pokemon({ species: "clefairy", level: 30, moves: ["moonlight"], at: [-3, 0, 0] });

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
        return stage.casts("moonlight", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("moonlight", caster) >= 1, "the wounded clefairy received the moonlight below its threshold");
        stage.after(120, function () {
            stage.expect(caster.health() > woundedAt + 5, "the moonlight was restored as health above the wound floor");
            stage.note("月色可及（夜晚 × 可见天空 × 无雨）是二值读数：夜里晴空为 1，回复约最大生命的 2/3；白天或阴雨为 0，只回约 1/4。回复比例随亲密度增长（0-140 的眷顾项），落光数与画面尺寸取自同一份月色。execute 里无条件调用 CombatStatus.cure(world, self, \"burn\")：只要施术者身上带着任一来源的灼伤就会被冷却，本场景未施加灼伤，所以看不到 soothe 这一幕。", {
                casterCasts: stage.casts("moonlight", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                burned: stage.hadMobEffect(caster, "world_combat:status/burn"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "moonlight is cast below the heal threshold on a clear night within 40 s");
});
