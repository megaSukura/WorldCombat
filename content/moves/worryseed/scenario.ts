/** 烦恼种子：投射种子，将目标特性暂时替换为不眠并唤醒睡眠目标。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("worryseed", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Gloom", level: 40, moves: ["worryseed"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Growlithe", level: 24, ability: "intimidate", moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: gloom(40) worryseed vs growlithe(24, intimidate); the target's Ability is suppressible so the cast should be accepted");
    stage.until(1200, function () { return stage.hadMobEffect(target, "world_combat:status/worryseed"); }, function () {
        stage.expect(stage.casts("worryseed", caster) >= 1, "worryseed was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/worryseed"), "the worry-seed status appeared on the target");
        stage.note("worryseed committed; the target's Ability is overridden with insomnia through the shared NativeModifiers ability layer, and rules.ts blocks sleep for any insomnia holder", {
            casts: stage.casts("worryseed", caster)
        });
        stage.done();
    }, "worry seed planted");
});
