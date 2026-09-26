/**
 * 喷火 / eruption 的可执行设计说明。
 *
 * 场面：一只满血、只会喷火的精灵站在平地，身前 3 格有一只敌对铁傀儡；另一只铁傀儡站在 4 格外、
 *   被一道完整实墙（z=2 的整排方块，离它一格远，避免碰撞箱压墙）挡住——爆心到它的通路被墙截断。
 *   两只都不还手。
 * 必然事实：本招被提交过；身前的目标受到过伤害（喷发命中）；墙后的目标一点也没挨到。
 * 是否点着、外推与上抛多高，都是概率与位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("eruption", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 5, 8], "minecraft:air");
    stage.fill([0, 0, 2], [4, 3, 2], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Camerupt", level: 40, moves: ["eruption"], at: [0, 0, 0] });
    var open = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var behind = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 4] });
    stage.noai(open, behind);
    stage.hostile(caster, open);
    stage.until(900, function () {
        return stage.casts("eruption") > 0 && stage.damageTo(open) > 0;
    }, function () {
        stage.expect(stage.casts("eruption") > 0, "eruption was committed");
        stage.expect(stage.damageTo(open) > 0, "the eruption scorched the open target");
        stage.expect(stage.damageTo(behind) === 0, "the solid wall blocked the blast to the target behind it");
        stage.note("eruption observations", { casts: stage.casts("eruption"), onOpen: stage.damageTo(open),
            onBehind: stage.damageTo(behind), burned: stage.hadMobEffect(open, "world_combat:status/burn"),
            casterHealth: Math.round(caster.health() * 10) / 10 });
        stage.done();
    }, "eruption lands");
});
