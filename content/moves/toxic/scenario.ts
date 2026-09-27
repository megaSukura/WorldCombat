// 原生毒唯一计伤；检查实际附着和持续毒伤，毒性到期自然收束。
// 加深从目标身上真正生效的毒载体强度起步、重施不降级已有更强的毒，这两点是代码层保证；
// 单场景里无法稳定先造出更强的毒再重施，因此只断言附着与累计毒伤，强度归属见 skill.ts。
Smoke.scenario("toxic", function (stage) {
    var caster = stage.pokemon({ species: "Gengar", level: 40, moves: ["toxic"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 25, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("toxic") > 0 && stage.hadMobEffect(target, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("toxic") > 0, "toxic was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/poison"), "the shared poison identity landed on the target");
        stage.expect(stage.hadMobEffect(target, "minecraft:poison"), "the shared default poison effect landed on the target");
        stage.note("venom rooted", { casts: stage.casts("toxic"), health: target.health() });
        stage.until(900, function () { return stage.damageTo(target) >= 20 || !target.alive(); }, function () {
            stage.expect(stage.damageTo(target) >= 20, "the venom's escalating damage accumulated well beyond one tick");
            stage.note("venom matured", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                health: target.health(), alive: target.alive() });
            stage.done();
        }, "native poison accumulates damage");
    }, "toxic applied");
});
