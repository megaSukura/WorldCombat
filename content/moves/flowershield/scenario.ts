// 鲜花防守的执行性设计说明：这是一圈从施法者身上推开的花浪，只扫到视线可达的草属性／持花受益者。
// 必然事实：施法者提交过鲜花防守；草属性施法者与手持鲜花、视线可达的普通队友都获得共享身份 world_combat:status/petaled；
// 墙后的持花者不在这一圈里，拿不到护瓣。敌人是否同时受益、实际防御级数与窗口长度取决于现场数据，写进 note。
Smoke.scenario("flowershield", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "roselia", level: 32, moves: ["flowershield"], at: [-1, 0, 0] });
    var ally = stage.mob({ type: "minecraft:villager", at: [1, 0, 0] });
    stage.noai(ally);
    stage.command("item replace entity " + ally.ref.split("/")[0] + " weapon.mainhand with minecraft:poppy");
    // 墙后的持花者与施法者之间隔着实心方块，花浪传不过去。
    var blocked = stage.mob({ type: "minecraft:villager", at: [-1, 0, 3] });
    stage.noai(blocked);
    stage.command("item replace entity " + blocked.ref.split("/")[0] + " weapon.mainhand with minecraft:poppy");
    stage.fill([-1, 0, 1], [-1, 2, 1], "minecraft:stone");
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("garden", [caster, ally, blocked]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("flowershield", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/petaled")
            && stage.hadMobEffect(ally, "world_combat:status/petaled");
    }, function () {
        stage.expect(stage.casts("flowershield", caster) > 0, "flowershield was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/petaled"), "the Grass caster was shielded by the wave");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/petaled"), "the flower-holding ordinary ally in sight was shielded");
        stage.expect(stage.attribute(ally, "minecraft:generic.armor") > 0, "the flower holder received real armor");
        stage.expect(!stage.hadMobEffect(blocked, "world_combat:status/petaled"), "a flower holder behind a wall never received the shield");
        stage.note("The Grass caster and an in-sight flower holder receive the same shield, friend or foe alike; a holder walled off from the caster receives nothing. The defense gain is a temporary boostWindow tied to each carrier, so it is withdrawn exactly when that carrier ends.", {
            casterCasts: stage.casts("flowershield", caster),
            allyArmor: stage.attribute(ally, "minecraft:generic.armor"),
            blockedArmor: stage.attribute(blocked, "minecraft:generic.armor"),
            casterStages: stage.stages(caster)
        });
        stage.done();
    }, "flowershield shields the visible grass ring");
});
