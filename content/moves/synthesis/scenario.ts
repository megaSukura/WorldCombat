/**
 * 光合作用 / Synthesis —— 可执行设计说明。
 *
 * 一句话：在阳光下摊开叶片，把光合成生命；AI 只在自身生命低于 ai.healBelow（默认 0.7）且所在点日照达到
 *   ai.minimumLight（默认 0.2）时才动用。所以场面要先把施术者压到阈值以下，并给它一块见得到天的亮处。
 *
 * 场面：晴天白天、开阔平地（竞技场上空无遮挡，天光 15）。只会光合作用的毽子草（hoppip，会学这招；技能表
 *   只给这一招）站在一侧；附近没有敌人。施术者在开局被一次性压到自身最大生命约 55%（单次 /damage，避免持续
 *   补刀把回复掩盖掉），跨过回复阈值。
 *
 * 必然事实：施术者提交过光合作用；回复在 execute 里立即结算，日照正午接近 1，因此结算后施术者生命必定高于
 *   压血后的最低值。日照系数、回复比例与画面密度依赖位置与时间，写进 note。
 */
Smoke.scenario("synthesis", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "hoppip", level: 30, moves: ["synthesis"], at: [-3, 0, 0] });

    // 一次性压到约 45%，记录压血后的最低值；之后不再补刀，让恢复稳定结算。
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
        return stage.casts("synthesis", caster) >= 1 && woundedAt > 0;
    }, function () {
        stage.expect(stage.casts("synthesis", caster) >= 1, "the wounded hoppip spread its leaves to synthesise in the open sun");
        stage.after(120, function () {
            stage.expect(caster.health() > woundedAt + 5, "the sunlight was converted into health above the wound floor");
            stage.note("日照系数（WorldEnvironment.sunlight = 天光/15 × 白天 × 可见天空 × 阴雨折扣）与回复比例、叶数、起始叶尺寸都取自同一份世界读数：正午晴天接近 1，树荫/夜里接近 0。回复比例随特防增长（毽子草特防偏低），范围 30%-72%。本场景开阔无遮挡，因此必定有可观的回复。", {
                casterCasts: stage.casts("synthesis", caster),
                woundedHealth: Math.round(woundedAt * 10) / 10,
                casterHealthNow: Math.round(caster.health() * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "synthesis is cast below the heal threshold in the open sun within 40 s");
});
