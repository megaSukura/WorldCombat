// 冰雹：把一片雹区压在交战区。断言两件必然事实——放出来了、区内有人挂上共享的冰雹身份；
// 再断言本轮的头顶遮挡：露天者被砸、屋檐下的人不受砸，且落地不再铺真方块。
// 砸击、冰属性免疫在区域规则里结算，场景把实际伤害与地面块记进 note 供读轨迹。
Smoke.scenario("hail", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "vanillite", level: 32, moves: ["hail"], at: [-3, 0, 0] });
    const open = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [2, 0, 0] });
    const roofed = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [0, 0, 2] });
    stage.hostile(caster, open);
    stage.hostile(caster, roofed);
    stage.noai(open, roofed);
    // 给第二只盖一块实心顶棚：雹云与它头顶之间被挡住。
    stage.fill([-1, 3, 1], [1, 3, 3], "minecraft:stone");
    stage.until(1200, function () {
        return stage.casts("hail", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/hail") || stage.hadMobEffect(open, "world_combat:status/hail")
                || stage.hadMobEffect(roofed, "world_combat:status/hail"));
    }, function () {
        stage.expect(stage.casts("hail", caster) > 0, "hail was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/hail") || stage.hadMobEffect(open, "world_combat:status/hail")
            || stage.hadMobEffect(roofed, "world_combat:status/hail"), "a body inside the hail carries the shared hail identity");
        stage.after(280, function () {
            stage.expect(stage.damageTo(open) > 0, "an open body inside the storm is pelted");
            stage.expect(stage.damageTo(roofed) === 0, "a body under a solid roof takes no pelting");
            stage.expect(stage.blockAt([0, 1, 2]) === "minecraft:air", "the storm leaves no ice blocks on the ground");
            stage.note("hailstones fall over the engagement; the open body is pelted while the one under the stone roof is protected, and the ground is only marked by short-lived shard particles. Ice immunity and the per-pass pelt are read in the field rule; targetOpen/roofedDamage show the split.",
                { casts: stage.casts("hail", caster),
                  casterStruck: stage.hadMobEffect(caster, "world_combat:status/hail"),
                  openStruck: stage.hadMobEffect(open, "world_combat:status/hail"),
                  roofedStruck: stage.hadMobEffect(roofed, "world_combat:status/hail"),
                  openDamage: stage.damageTo(open), roofedDamage: stage.damageTo(roofed),
                  ground: stage.blockAt([0, 1, 2]) });
            stage.done();
        });
    }, "hailstones fall on the arena");
});
