/**
 * 抓 / scratch 的可执行设计说明。
 *
 * 场面：只会抓的猫老大（Persian，快而多爪）贴着被点住、不会走开的铁傀儡（体型宽大、耐打），晴天平地。
 * 铁傀儡用 `NoAI` 定住，保证贴身不会被甩开；它够宽，一爪容易同时抓中多道痕。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（至少一道爪痕命中）。
 * 一次抓中几道痕（速度决定的道数、目标体型决定的覆盖）写进 note 供读轨迹判断。
 */
Smoke.scenario("scratch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Persian", level: 24, moves: ["scratch"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("scratch", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("scratch", caster) > 0, "scratch was committed");
            stage.expect(stage.damageTo(foe) > 0, "at least one claw line landed");
            stage.note("一爪多道痕：命中数随目标体型与站位变化；快的手一次多划一道", {
                casts: stage.casts("scratch", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "scratch lands a rake on a wide stationary foe at point-blank range");
});
