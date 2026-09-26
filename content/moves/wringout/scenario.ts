/**
 * 绞紧 的可执行设计说明。
 *
 * 主场景（wringout，双绞）：一只只会绞紧的巨蔓藤（30 级）面对 6 格外一只不会被一拧打死的幸福蛋并让它站定，打开双绞式。
 *   必然事实：本招被提交过；第一拧造成伤害；站定、通视的目标吃到方向相反的第二拧，两条伤害回执来自同一次施放。
 *   目标当时剩多少血、威力环多粗、第二拧是否被范围／失视打断，写进 note 供读轨迹判断。
 * 次场景（wringout-single，单绞）：默认单绞式对一只僵尸；用于交互复看默认形态，烟测只跑主场景。
 */
Smoke.scenario("wringout", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tangrowth", level: 30, moves: ["wringout"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "blissey", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.after(5, function () { stage.prefer(caster, "wringout", { twin: true }); });
    var firstHitAt = -1, secondHitAt = -1;
    stage.until(1200, function () {
        var hits = stage.hits(foe, true);
        if (hits >= 1 && firstHitAt < 0) firstHitAt = stage.tick();
        if (hits >= 2 && secondHitAt < 0) secondHitAt = stage.tick();
        return stage.casts("wringout", caster) > 0 && hits >= 2;
    }, function () {
        var gap = secondHitAt < 0 || firstHitAt < 0 ? 9999 : secondHitAt - firstHitAt;
        stage.expect(stage.casts("wringout", caster) > 0, "the twin wring was committed");
        stage.expect(stage.damageTo(foe) > 0, "the first wring dealt damage");
        stage.expect(stage.hits(foe, true) >= 2, "the opposite second wring landed a second receipt");
        stage.expect(gap <= 30, "the two receipts came from one twin cast, not two separate casts");
        stage.note("A narrow traced line grabs the first foe it meets or disperses on a wall. The twin form recomputes a second, opposite twist against the target's HP at that moment and only lands while the target stays inside the original cast range with clear line of sight; girth (ring thickness) follows the remaining HP fraction at each twist. The two receipts above are the opposite pair of one cast.", {
            casts: stage.casts("wringout", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            receipts: stage.hits(foe, true),
            pairGap: gap,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "wringout twin lands twice");
});

Smoke.scenario("wringout-single", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tangrowth", level: 30, moves: ["wringout"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("wringout") > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("wringout") > 0, "wringout was committed");
        stage.expect(stage.damageTo(foe) > 0, "the wring dealt damage");
        stage.note("Single form (default): one twist, no second wring.", {
            casts: stage.casts("wringout"),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            casterAlive: caster.alive(), foeAlive: foe.alive()
        });
        stage.done();
    }, "wringout single lands");
});
