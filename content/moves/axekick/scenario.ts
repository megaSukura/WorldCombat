/**
 * 下压踢 / axekick 的可执行设计说明。
 *
 * 场面：会下压踢的恰雷姆（Medicham）对一只血厚、只会跃起、不会还手的卡比兽（Snorlax），双方开战。
 * 必然事实：本招被提交过；它命中过靶子（`damageTo(foe) > 0`）；施法者短垫过一小步（`travelled > 0.1`，含AI接近）。
 * 靶子血厚是让它扛过几次下劈，给恍惚多次掷骰机会，也让轨迹能看到本招在交战里被反复放出；
 * 恍惚是每次命中按 dazeChance 掷骰的随机结果，写进 note（`hadMobEffect`）供读轨迹判断，不作断言。
 */
Smoke.scenario("axekick", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Medicham", level: 42, moves: ["axekick"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 70, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("axekick", caster) >= 3 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("axekick", caster) > 0, "axe kick was committed");
        stage.expect(stage.damageTo(foe) > 0, "the heel struck the target");
        stage.expect(stage.travelled(caster) > 0.1, "the user stepped toward the band");
        stage.note("daze is rolled per hit at the computed chance, so a false reading is possible; a self-hurt appears only when the fixed vertical band is empty", {
            casts: stage.casts("axekick", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            foeDazed: stage.hadMobEffect(foe, "world_combat:status/confusion"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "axe kick lands on a foe");
});
