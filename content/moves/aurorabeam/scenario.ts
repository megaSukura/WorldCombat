/**
 * 极光束的可执行设计说明：让会这一招的冰系对手朝一名格斗系目标射一道虹光，验证光束命中、造成伤害。
 * 降攻（基础 10% 起）与落点霜斑是随机／地形结果；冰面折射是依赖真实方块面法线的几何结果，都写进 note。
 */
Smoke.scenario("aurorabeam", function (stage) {
    // Record a stone floor under the firing line so the leased frost shows up in changedBlocks.
    stage.fill([-8, -1, -3], [3, -1, 3], "minecraft:stone");
    var seel = stage.pokemon({ species: "seel", level: 32, moves: ["aurorabeam"], at: [-5, 0, 0] });
    var machop = stage.pokemon({ species: "machop", level: 26, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(seel, machop);
    stage.until(900, function () { return stage.casts("aurorabeam", seel) > 0 && stage.damageTo(machop) > 0; }, function () {
        stage.expect(stage.casts("aurorabeam", seel) > 0, "极光束被射出来了");
        stage.expect(stage.damageTo(machop) > 0, "虹光打到了目标身上");
        stage.after(15, function () {
            stage.note("降攻（基础 10% 起）是随机结果；落点会租出一小片霜（minecraft:packed_ice），到期原方块回来。冰面折射只在真实撞到已有雪/冰表面且有有效 blockFace 时发生，且总路程不超过射程——这段几何依赖具体瞄准，不在 smoke 内硬断言。",
                { casts: stage.casts("aurorabeam", seel), damage: Math.round(stage.damageTo(machop) * 10) / 10,
                  blocks: stage.changedBlocks().length });
            stage.done();
        });
    }, "虹光命中目标");
});
