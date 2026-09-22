/** 日光束：蓄力后贯穿直线上的敌人；阳光影响蓄力和威力，光束与命中碎光承载反馈。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("solarbeam", function (stage) {
    stage.time("night");
    stage.weather("clear");
    stage.fill([-3, -1, -2], [11, -1, 2], "minecraft:grass_block");
    // A wall across the firing line: line of sight is blocked, so the shared AI must not start the gather.
    stage.fill([1, 0, -12], [1, 4, 12], "minecraft:stone");
    var caster = stage.pokemon({ species: "venusaur", level: 40, moves: ["solarbeam"], at: [-3, 0, 0] });
    // A stationary punching bag: sleeping, so it stays on the line through the gather and the release.
    var target = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, target);
    // Condition-not-met side: while the wall stands, no beam may start.
    stage.after(70, function () {
        stage.expect(stage.casts("solarbeam", caster) === 0, "no beam was started with the wall blocking the line");
        stage.note("with the line blocked the caster held its gather", { casts: stage.casts("solarbeam", caster), casterTravelled: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.command("fill ~1 ~ ~-12 ~1 ~4 ~12 minecraft:air");
    });
    stage.until(1200, function () {
        return stage.casts("solarbeam", caster) >= 1 && stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.casts("solarbeam", caster) >= 1, "venusaur committed solar beam");
        stage.expect(stage.damageTo(target) > 0, "the beam damaged the target on the line");
        stage.note("The night cast gathers before firing and damages a target after the wall is removed. Damage rolls, critical hits and survival vary; the instant sunlight release remains outside this scenario.", {
            casts: stage.casts("solarbeam", caster),
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
            targetHealth: Math.round(target.health() * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "solar beam fires after the line clears within 60 s");
});
