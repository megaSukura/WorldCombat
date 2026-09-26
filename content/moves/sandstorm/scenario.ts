// 沙暴：把一片有固定风向的沙幕压在交战区，沙阵沿风向一条条扫过。断言「放出来了」「有人挂上共享的沙暴身份」
// 两件必然事实，并核对「地表不再被铺上方块」。磨蚀、顺风推沙、条带与掩体背风面都在区域规则里按趟结算，
// 场景把实际伤害与位置记进 note 供读轨迹。
Smoke.scenario("sandstorm", function (stage) {
    stage.weather("clear");
    stage.time("day");
    stage.watch([-10, -2, -10], [10, 4, 10]);

    const caster = stage.pokemon({ species: "sandshrew", level: 34, moves: ["sandstorm"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("sandstorm", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/sandstorm") || stage.hadMobEffect(target, "world_combat:status/sandstorm"));
    }, function () {
        stage.expect(stage.casts("sandstorm", caster) > 0, "sandstorm was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/sandstorm") || stage.hadMobEffect(target, "world_combat:status/sandstorm"),
            "a body inside the sand carries the shared sandstorm identity");
        stage.expect(stage.changedBlocks().length === 0, "the storm leaves only surface sand, no placed blocks");
        stage.after(320, function () {
            stage.note("directional sand curtain laid over the engagement; a body inside carries the sandstorm identity. The wind snapshot, lane advance, upwind shelter and downwind drift are read in the field rule; targetDamage shows the scouring that landed.",
                { casts: stage.casts("sandstorm", caster),
                  casterSwept: stage.hadMobEffect(caster, "world_combat:status/sandstorm"),
                  targetSwept: stage.hadMobEffect(target, "world_combat:status/sandstorm"),
                  targetInside: stage.hasMobEffect(target, "world_combat:status/sandstorm"),
                  placedBlocks: stage.changedBlocks().length,
                  targetDamage: stage.damageTo(target),
                  casterPos: caster.position(),
                  targetPos: target.position() });
            stage.done();
        });
    }, "sand rises over the arena");
});
