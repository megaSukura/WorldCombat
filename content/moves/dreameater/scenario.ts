/**
 * 食梦 / dreameater 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会食梦的迷唇姐（jynx）对一只只会「跃起」的卡比兽（snorlax，伤害不了施法者）；
 *   先把施法者用 /damage 分步压到约六成半，跨过掉血状态。
 *
 * 必然事实：目标醒着时，食梦以「共享睡眠身份」为前提，不会被放出来；把共享睡眠用 /effect 续上之后，
 *   本招被提交过、目标受到过梦之伤害、施法者从这一口回复过生命（生命高于压血后的基线）。
 *   暴击、回复比例与剩余睡眠的梦深是随机／数据项，写进 note 供读轨迹判断。
 */
Smoke.scenario("dreameater", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "jynx", level: 40, moves: ["dreameater"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [0, 0, 0] });

    var maximum = 0, baseline = 0, wounded = false, tries = 0;
    function wound(): void {
        if (wounded || !caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.65 || tries >= 24) { baseline = caster.health(); wounded = true; return; }
        tries++;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.08)) + " minecraft:generic");
        stage.after(6, wound);
    }
    stage.after(5, wound);

    stage.until(300, function () { return wounded; }, function () {
        stage.hostile(caster, foe);
        stage.note("目标醒着：食梦以共享睡眠身份为前提，这时不该被提出");
        stage.after(160, function () {
            stage.expect(stage.casts("dreameater", caster) === 0, "awake target was never dream-eaten");
            stage.note("按周期给目标续上共享睡眠，睡着之后应当开始食梦");
            function keepAsleep(): void {
                if (!foe.alive()) return;
                var at = foe.position();
                stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                    + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:sleep 30 0 true");
                stage.after(25, keepAsleep);
            }
            keepAsleep();
            stage.until(900, function () {
                return stage.casts("dreameater", caster) > 0 && stage.damageTo(foe) > 0 && caster.health() > baseline + 2;
            }, function () {
                stage.expect(stage.casts("dreameater", caster) > 0, "the sleeping target was dream-eaten");
                stage.expect(stage.damageTo(foe) > 0, "the dream draw dealt damage");
                stage.expect(caster.health() > baseline + 2, "the user regained health from the dream");
                stage.note("伤害与回血走共享伤害载荷的 drain；梦深来自目标剩余睡眠，暴击与命中率不写死。",
                    { casts: stage.casts("dreameater", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                      woundedHealth: Math.round(baseline * 10) / 10, casterHealth: Math.round(caster.health() * 10) / 10,
                      sleptEver: stage.hadMobEffect(foe, "world_combat:status/sleep"), foeAlive: foe.alive() });
                stage.done();
            }, "dream eater lands on the sleeper");
        });
    }, "caster is wounded below 65%");
});
