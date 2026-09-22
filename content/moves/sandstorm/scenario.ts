// 沙暴：把一片沙幕压在交战区，幕里的人被磨。断言「放出来了」和「有人挂上共享的沙暴身份」两件必然事实；
// 磨蚀与推沙在区域规则里按趟结算，场景把实际伤害记进 note 供读轨迹。
Smoke.scenario("sandstorm", function (stage) {
    stage.weather("clear");
    stage.time("day");

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
        stage.after(260, function () {
            stage.note("sand curtain laid over the engagement; a body inside carries the sandstorm identity. Rock/Ground/Steel immunity, the per-pass scour, the outward drift and the ground sand are read in the field rule; targetDamage shows the scouring that landed while both stayed inside.",
                { casts: stage.casts("sandstorm", caster),
                  casterSwept: stage.hadMobEffect(caster, "world_combat:status/sandstorm"),
                  targetSwept: stage.hadMobEffect(target, "world_combat:status/sandstorm"),
                  targetInside: stage.hasMobEffect(target, "world_combat:status/sandstorm"),
                  targetDamage: stage.damageTo(target) });
            stage.done();
        });
    }, "sand rises over the arena");
});
