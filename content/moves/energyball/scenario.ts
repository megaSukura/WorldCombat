/**
 * 能量球的可执行设计说明：在一片草木里让会这一招的精灵朝一名对手掷出能量球，验证它命中、造成伤害，
 * 并在落点长出花草（changedBlocks 读到新放下的花草）。
 *
 * 场面特意铺了草与树叶：能量球的实际威力 = 球心威力 + 周围生机份数 × 每份生机，这是本招独有的环境依赖。
 * 生机份数、碾防（约 10% 起）、落点具体长出什么与目标是否撑得住都不是本场景的必然事实，写进 note。
 */
Smoke.scenario("energyball", function (stage) {
    // 整块场地铺草方块；登记一层空地，方便核对落点把空地种成花草；施法者一侧另铺草与树叶供吸取。
    stage.fill([-10, -1, -5], [9, -1, 5], "minecraft:grass_block");
    stage.fill([-9, 0, -4], [8, 0, 4], "minecraft:air");
    stage.fill([-9, 0, -3], [-4, 0, 3], "minecraft:short_grass");
    stage.fill([-9, 1, -2], [-5, 1, 2], "minecraft:oak_leaves");
    var caster = stage.pokemon({ species: "bulbasaur", level: 34, moves: ["energyball"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "machop", level: 28, moves: ["tackle"], status: "sleep", at: [0, 0, 0] });
    stage.hostile(caster, target);
    function bloomed(): { at: number[]; before: string; after: string }[] {
        var palette = ["minecraft:short_grass", "minecraft:moss_carpet", "minecraft:dandelion",
            "minecraft:azure_bluet", "minecraft:poppy", "minecraft:cornflower"];
        return stage.changedBlocks().filter(function (cell) { return palette.indexOf(cell.after) >= 0; });
    }
    stage.until(1200, function () {
        return stage.casts("energyball", caster) > 0 && stage.damageTo(target) > 0;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("energyball", caster) > 0, "energyball was committed");
            stage.expect(stage.damageTo(target) > 0, "the ball damaged the target");
            stage.expect(bloomed().length > 0, "a patch of growth appeared where the ball landed");
            stage.note("the gathered nature count, the passive Sp. Def roll (about 10% base), exactly what grew and whether the target survived are random/positional; total power rises with surrounding vegetation", {
                casts: stage.casts("energyball", caster),
                damage: Math.round(stage.damageTo(target) * 10) / 10,
                grown: bloomed().length,
                casterHp: Math.round(caster.health() * 10) / 10,
                targetAlive: target.alive()
            });
            stage.done();
        });
    }, "energyball lands and leaves growth within 60 s");
});
