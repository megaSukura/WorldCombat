/** A real two-block-deep open-water basin leads to a supported bank. Sharpedo moves through water, rises and makes one actual exit contact; the original roofed fixture could not prove a breach. */
Smoke.scenario("dive", function (stage) {
    // 水面与岸边同高，水体在地表下两格深，允许真实上浮到岸边。
    stage.fill([-9, -3, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([-7, -2, -2], [3, -1, 2], "minecraft:water");
    stage.time("midnight");
    stage.weather("clear");

    var a = stage.pokemon({ species: "sharpedo", level: 40, moves: ["dive"], at: [-5, -1.2, 0] });
    var b = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.noai(b);
    stage.hostile(a, b);

    stage.until(1200, function () {
        return stage.casts("dive", a) >= 1 && stage.damageTo(b) > 0;
    }, function () {
        stage.expect(stage.casts("dive", a) >= 1, "sharpedo committed dive in real water");
        stage.expect(stage.travelled(a) > 2, "the body really travelled along the water route");
        stage.expect(stage.damageTo(b) > 0, "the burst out of the water reached the target and dealt damage");
        stage.note("随机/位置相关：目标是否在水路到达前走开（冻结的僵尸不会走）、伤害与暴击、顶飞/推开多远、本体实际出水点；深潜由真实水体触发", {
            casts: stage.casts("dive", a),
            damageToTarget: Math.round(stage.damageTo(b) * 10) / 10,
            userTravelled: Math.round(stage.travelled(a) * 10) / 10,
            targetTravelled: Math.round(stage.travelled(b) * 10) / 10,
            targetAlive: b.alive(),
            casterAt: a.position().map(function (n) { return Math.round(n * 10) / 10; }),
            targetAt: b.position().map(function (n) { return Math.round(n * 10) / 10; })
        });
        stage.done();
    }, "dive runs a real water route and hits within 60 s");
});
