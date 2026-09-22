// 冰雹：把一片雹区压在交战区，非冰之躯被砸。断言「放出来了」和「有人挂上共享的冰雹身份」两件必然事实；
// 砸击、冰属性免疫与落地碎冰在区域规则里结算，场景把实际伤害记进 note 供读轨迹。
Smoke.scenario("hail", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "vanillite", level: 32, moves: ["hail"], at: [-2, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("hail", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/hail") || stage.hadMobEffect(target, "world_combat:status/hail"));
    }, function () {
        stage.expect(stage.casts("hail", caster) > 0, "hail was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/hail") || stage.hadMobEffect(target, "world_combat:status/hail"),
            "a body inside the hail carries the shared hail identity");
        stage.after(260, function () {
            stage.note("hailstones fall over the engagement; a body inside carries the hail identity, and the Ice caster is unharmed by its own storm. Ice immunity, the per-pass pelt and the ground ice are read in the field rule; targetDamage shows the pelting that landed while both stayed inside.",
                { casts: stage.casts("hail", caster),
                  casterStruck: stage.hadMobEffect(caster, "world_combat:status/hail"),
                  targetStruck: stage.hadMobEffect(target, "world_combat:status/hail"),
                  targetInside: stage.hasMobEffect(target, "world_combat:status/hail"),
                  targetDamage: stage.damageTo(target) });
            stage.done();
        });
    }, "hailstones fall on the arena");
});
