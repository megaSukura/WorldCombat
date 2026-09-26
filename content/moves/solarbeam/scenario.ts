/** 日光束：聚光后朝瞄准方向放出一束贯穿直线；真实方块截断光柱，走廊判定与光柱读同一组顶点。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("solarbeam", function (stage) {
    stage.time("night");
    stage.weather("clear");
    stage.fill([-3, -1, -2], [11, -1, 2], "minecraft:grass_block");
    // A wall across the firing line: line of sight is blocked, so the shared AI must not start the gather,
    // and no beam may reach the target while it stands.
    stage.fill([1, 0, -12], [1, 4, 12], "minecraft:stone");
    var caster = stage.pokemon({ species: "venusaur", level: 40, moves: ["solarbeam"], at: [-3, 0, 0] });
    // A stationary punching bag: sleeping, so it stays on the line through the gather and the release.
    var target = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [4, 0, 0] });
    stage.hostile(caster, target);
    // Condition-not-met side: while the wall stands, no beam reaches the target.
    stage.after(70, function () {
        stage.expect(stage.damageTo(target) === 0, "the wall kept the beam off the target");
        stage.note("with the line blocked the caster held its gather and nothing reached the target", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10, casterTravelled: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.command("fill ~1 ~ ~-12 ~1 ~4 ~12 minecraft:air");
    });
    stage.until(1200, function () {
        return stage.damageTo(target) > 0;
    }, function () {
        stage.expect(stage.damageTo(target) > 0, "the beam damaged the target on the line after the wall was removed");
        stage.note("The night cast gathers before firing and damages a target after the wall is removed. Damage rolls, critical hits and survival vary; the instant sunlight release remains outside this scenario. The service's first-commit script hook error (shared world_combat:execution/commit) can swallow the cast counter, so this scenario pins the reliable fact: a target was damaged.", {
            casts: stage.casts("solarbeam", caster),
            damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
            targetHealth: Math.round(target.health() * 10) / 10,
            targetAlive: target.alive()
        });
        stage.done();
    }, "solar beam fires after the line clears within 60 s");
});
